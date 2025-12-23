package com.example.bestapp.network

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Менеджер WebSocket соединения для получения заявок в реальном времени
 */
class WebSocketManager(
    private val baseUrl: String = "ws://212.74.227.208:3000/ws",
    private val scope: CoroutineScope
) {
    companion object {
        private const val TAG = "WebSocketManager"
        private const val PING_INTERVAL_MS = 45_000L // 45 секунд
        private const val RECONNECT_DELAY_MS = 5_000L // 5 секунд
        private const val MAX_RECONNECT_ATTEMPTS = 5
    }

    private var webSocket: WebSocket? = null
    private var pingJob: Job? = null
    private var reconnectAttempts = 0
    private var isManualDisconnect = false
    private var authToken: String? = null

    // Состояние подключения
    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    // Новые назначения
    private val _newAssignment = MutableStateFlow<AssignmentEvent?>(null)
    val newAssignment: StateFlow<AssignmentEvent?> = _newAssignment.asStateFlow()

    // Истекшие назначения
    private val _expiredAssignment = MutableStateFlow<Int?>(null)
    val expiredAssignment: StateFlow<Int?> = _expiredAssignment.asStateFlow()

    // Обновления статуса заказа
    private val _orderStatusUpdate = MutableStateFlow<OrderStatusUpdate?>(null)
    val orderStatusUpdate: StateFlow<OrderStatusUpdate?> = _orderStatusUpdate.asStateFlow()

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS) // Нет таймаута для WebSocket
        .writeTimeout(10, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS) // TCP keep-alive
        .build()

    /**
     * Подключиться к WebSocket серверу
     */
    fun connect(token: String) {
        if (_connectionState.value is ConnectionState.Connected ||
            _connectionState.value is ConnectionState.Connecting
        ) {
            Log.d(TAG, "Уже подключен или идет подключение")
            return
        }

        authToken = token
        isManualDisconnect = false
        reconnectAttempts = 0

        Log.d(TAG, "Подключение к WebSocket: $baseUrl")
        _connectionState.value = ConnectionState.Connecting

        val request = Request.Builder()
            .url(baseUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "✅ WebSocket подключен")
                _connectionState.value = ConnectionState.Connected
                reconnectAttempts = 0

                // Отправляем токен аутентификации
                authenticate(token)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "📩 Получено сообщение: $text")
                handleMessage(text)
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                Log.d(TAG, "📩 Получено бинарное сообщение: ${bytes.hex()}")
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.w(TAG, "⚠️ WebSocket закрывается: $code - $reason")
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.w(TAG, "❌ WebSocket закрыт: $code - $reason")
                _connectionState.value = ConnectionState.Disconnected
                stopPing()

                // Автоматически переподключаемся, если не было ручного отключения
                if (!isManualDisconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    scheduleReconnect()
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "❌ Ошибка WebSocket: ${t.message}", t)
                _connectionState.value = ConnectionState.Error(t.message ?: "Неизвестная ошибка")
                stopPing()

                // Автоматически переподключаемся
                if (!isManualDisconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    scheduleReconnect()
                }
            }
        })
    }

    /**
     * Отправить токен аутентификации
     */
    private fun authenticate(token: String) {
        val authMessage = JSONObject().apply {
            put("type", "auth")
            put("token", token)
        }

        sendMessage(authMessage)
        Log.d(TAG, "🔑 Отправлена аутентификация")
    }

    /**
     * Подписаться на получение заявок
     */
    fun subscribeToAssignments() {
        val subscribeMessage = JSONObject().apply {
            put("type", "subscribe_assignments")
        }

        sendMessage(subscribeMessage)
        Log.d(TAG, "📋 Подписка на заявки отправлена")
    }

    /**
     * Отписаться от заявок
     */
    fun unsubscribeFromAssignments() {
        val unsubscribeMessage = JSONObject().apply {
            put("type", "unsubscribe_assignments")
        }

        sendMessage(unsubscribeMessage)
        Log.d(TAG, "📋 Отписка от заявок отправлена")
    }

    /**
     * Обработка входящих сообщений
     */
    private fun handleMessage(text: String) {
        try {
            val json = JSONObject(text)
            val type = json.optString("type", "")

            when (type) {
                "auth_success" -> {
                    Log.d(TAG, "✅ Аутентификация успешна")
                    // Автоматически подписываемся на заявки
                    subscribeToAssignments()
                    // Запускаем ping
                    startPing()
                }

                "auth_error" -> {
                    val message = json.optString("message", "Ошибка аутентификации")
                    Log.e(TAG, "❌ Ошибка аутентификации: $message")
                    _connectionState.value = ConnectionState.Error(message)
                }

                "subscribed_assignments" -> {
                    Log.d(TAG, "✅ Подписка на заявки активирована")
                }

                "unsubscribed_assignments" -> {
                    Log.d(TAG, "✅ Подписка на заявки отменена")
                }

                "new_assignment" -> {
                    val assignment = json.getJSONObject("assignment")
                    Log.d(TAG, "🆕 Получена новая заявка: ${assignment.optInt("id")}")
                    _newAssignment.value = AssignmentEvent(
                        id = assignment.getInt("id"),
                        orderId = assignment.getInt("order_id"),
                        deviceType = assignment.optString("device_type"),
                        address = assignment.optString("address"),
                        problemDescription = assignment.optString("problem_description"),
                        expiresAt = assignment.optString("expires_at"),
                        attemptNumber = assignment.optInt("attempt_number", 1),
                        latitude = assignment.optDouble("latitude"),
                        longitude = assignment.optDouble("longitude")
                    )
                }

                "assignment_expired" -> {
                    val assignmentId = json.getInt("assignmentId")
                    Log.d(TAG, "⏰ Заявка истекла: $assignmentId")
                    _expiredAssignment.value = assignmentId
                }

                "order_status_update" -> {
                    val orderId = json.getInt("orderId")
                    val newStatus = json.getString("newStatus")
                    val timestamp = json.getString("timestamp")
                    Log.d(TAG, "📝 Обновление статуса заказа #$orderId: $newStatus")
                    _orderStatusUpdate.value = OrderStatusUpdate(orderId, newStatus, timestamp)
                }

                "pong" -> {
                    // Ответ на ping - соединение живо
                    Log.v(TAG, "🏓 Получен pong")
                }

                "error" -> {
                    val message = json.optString("message", "Неизвестная ошибка")
                    Log.e(TAG, "❌ Ошибка от сервера: $message")
                }

                else -> {
                    Log.w(TAG, "⚠️ Неизвестный тип сообщения: $type")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка обработки сообщения: ${e.message}", e)
        }
    }

    /**
     * Отправить сообщение на сервер
     */
    private fun sendMessage(json: JSONObject) {
        webSocket?.send(json.toString()) ?: run {
            Log.w(TAG, "⚠️ Не удалось отправить сообщение - WebSocket не подключен")
        }
    }

    /**
     * Запустить периодический ping
     */
    private fun startPing() {
        stopPing()

        pingJob = scope.launch(Dispatchers.IO) {
            while (isActive) {
                delay(PING_INTERVAL_MS)

                if (_connectionState.value is ConnectionState.Connected) {
                    val pingMessage = JSONObject().apply {
                        put("type", "ping")
                    }
                    sendMessage(pingMessage)
                    Log.v(TAG, "🏓 Отправлен ping")
                }
            }
        }
    }

    /**
     * Остановить ping
     */
    private fun stopPing() {
        pingJob?.cancel()
        pingJob = null
    }

    /**
     * Запланировать переподключение
     */
    private fun scheduleReconnect() {
        reconnectAttempts++
        Log.d(TAG, "🔄 Попытка переподключения #$reconnectAttempts через ${RECONNECT_DELAY_MS / 1000} сек")

        scope.launch(Dispatchers.IO) {
            delay(RECONNECT_DELAY_MS)

            if (!isManualDisconnect && authToken != null) {
                connect(authToken!!)
            }
        }
    }

    /**
     * Отключиться от WebSocket
     */
    fun disconnect() {
        Log.d(TAG, "🔌 Отключение от WebSocket")
        isManualDisconnect = true
        stopPing()
        webSocket?.close(1000, "Ручное отключение")
        webSocket = null
        _connectionState.value = ConnectionState.Disconnected
    }

    /**
     * Проверка подключения
     */
    fun isConnected(): Boolean {
        return _connectionState.value is ConnectionState.Connected
    }

    /**
     * Очистить события
     */
    fun clearNewAssignment() {
        _newAssignment.value = null
    }

    fun clearExpiredAssignment() {
        _expiredAssignment.value = null
    }

    fun clearOrderStatusUpdate() {
        _orderStatusUpdate.value = null
    }
}

/**
 * Состояния WebSocket подключения
 */
sealed class ConnectionState {
    object Disconnected : ConnectionState()
    object Connecting : ConnectionState()
    object Connected : ConnectionState()
    data class Error(val message: String) : ConnectionState()
}

/**
 * Событие новой заявки
 */
data class AssignmentEvent(
    val id: Int,
    val orderId: Int,
    val deviceType: String,
    val address: String,
    val problemDescription: String,
    val expiresAt: String,
    val attemptNumber: Int,
    val latitude: Double?,
    val longitude: Double?
)

/**
 * Обновление статуса заказа
 */
data class OrderStatusUpdate(
    val orderId: Int,
    val newStatus: String,
    val timestamp: String
)
