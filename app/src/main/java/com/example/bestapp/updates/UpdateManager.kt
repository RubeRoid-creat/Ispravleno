package com.example.bestapp.updates

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import com.example.bestapp.BuildConfig
import com.example.bestapp.api.ApiRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Менеджер обновлений приложения
 * Скачивает и устанавливает APK напрямую с сервера
 */
class UpdateManager(
    private val context: Context,
    private val scope: CoroutineScope
) {
    companion object {
        private const val TAG = "UpdateManager"
        private const val UPDATE_FILE_NAME = "app-update.apk"
    }

    private val apiRepository = ApiRepository()

    // Статус проверки обновлений
    private val _updateCheckStatus = MutableStateFlow<UpdateCheckStatus>(UpdateCheckStatus.Idle)
    val updateCheckStatus: StateFlow<UpdateCheckStatus> = _updateCheckStatus.asStateFlow()

    // Прогресс скачивания (только для In-App Updates)
    private val _downloadProgress = MutableStateFlow<DownloadProgress?>(null)
    val downloadProgress: StateFlow<DownloadProgress?> = _downloadProgress.asStateFlow()

    /**
     * Проверить наличие обновлений
     */
    fun checkForUpdates() {
        scope.launch {
            try {
                _updateCheckStatus.value = UpdateCheckStatus.Checking
                Log.d(TAG, "🔍 Проверка обновлений...")

                val currentVersion = BuildConfig.VERSION_NAME
                Log.d(TAG, "Текущая версия: $currentVersion")

                val result = apiRepository.checkAppVersion(
                    platform = "android_master",
                    appVersion = currentVersion,
                    buildVersion = BuildConfig.VERSION_CODE,
                    osVersion = Build.VERSION.SDK_INT.toString()
                )

                result.onSuccess { response ->
                    val updateRequired = response.updateRequired
                    val forceUpdate = response.forceUpdate
                    val newVersion = response.currentVersion
                    val downloadUrl = response.downloadUrl

                    Log.d(TAG, "Update required: $updateRequired, force: $forceUpdate")
                    Log.d(TAG, "New version: $newVersion, URL: $downloadUrl")

                    if (updateRequired && downloadUrl != null) {
                        val updateInfo = UpdateInfo(
                            currentVersion = currentVersion,
                            newVersion = newVersion ?: "unknown",
                            forceUpdate = forceUpdate,
                            downloadUrl = downloadUrl
                        )
                        _updateCheckStatus.value = UpdateCheckStatus.UpdateAvailable(updateInfo)
                        Log.d(TAG, "✅ Доступно обновление: $currentVersion -> $newVersion")
                    } else {
                        _updateCheckStatus.value = UpdateCheckStatus.NoUpdateAvailable
                        Log.d(TAG, "✅ Приложение обновлено до последней версии")
                    }
                }

                result.onFailure { error ->
                    Log.e(TAG, "❌ Ошибка проверки обновлений: ${error.message}")
                    _updateCheckStatus.value = UpdateCheckStatus.Error(error.message ?: "Ошибка проверки")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Ошибка проверки обновлений", e)
                _updateCheckStatus.value = UpdateCheckStatus.Error(e.message ?: "Неизвестная ошибка")
            }
        }
    }

    /**
     * Скачать и установить обновление
     */
    fun downloadAndInstall(downloadUrl: String) {
        scope.launch {
            try {
                _downloadProgress.value = DownloadProgress(0, "Начало загрузки...")
                Log.d(TAG, "📥 Начало загрузки обновления: $downloadUrl")

                val apkFile = withContext(Dispatchers.IO) {
                    downloadApk(downloadUrl)
                }

                if (apkFile != null) {
                    _downloadProgress.value = DownloadProgress(100, "Загрузка завершена")
                    Log.d(TAG, "✅ Обновление скачано: ${apkFile.absolutePath}")
                    installApk(apkFile)
                } else {
                    _downloadProgress.value = null
                    _updateCheckStatus.value = UpdateCheckStatus.Error("Не удалось скачать обновление")
                    Log.e(TAG, "❌ Не удалось скачать обновление")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Ошибка загрузки обновления", e)
                _downloadProgress.value = null
                _updateCheckStatus.value = UpdateCheckStatus.Error("Ошибка загрузки: ${e.message}")
            }
        }
    }

    /**
     * Скачать APK файл
     */
    private suspend fun downloadApk(downloadUrl: String): File? = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "🚀 Начало загрузки APK: $downloadUrl")
            
            // Используем OkHttp для более надежной загрузки
            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build()
            
            val request = Request.Builder()
                .url(downloadUrl)
                .get()
                .build()
            
            Log.d(TAG, "📡 Отправка запроса на загрузку...")
            val response = client.newCall(request).execute()
            
            if (!response.isSuccessful) {
                Log.e(TAG, "❌ Ошибка загрузки: ${response.code} ${response.message}")
                throw Exception("Ошибка загрузки: ${response.code} ${response.message}")
            }
            
            val fileLength = response.body?.contentLength() ?: -1L
            Log.d(TAG, "📦 Размер файла: $fileLength bytes")
            
            val body = response.body ?: throw Exception("Тело ответа пустое")
            val inputStream = body.byteStream()

            // Сохраняем во внутреннее хранилище
            val outputFile = File(context.cacheDir, UPDATE_FILE_NAME)
            // Удаляем старый файл, если есть
            if (outputFile.exists()) {
                outputFile.delete()
                Log.d(TAG, "🗑️ Удален старый файл обновления")
            }
            
            val outputStream = FileOutputStream(outputFile)

            val buffer = ByteArray(8192) // Увеличиваем размер буфера
            var total: Long = 0
            var count: Int
            var lastProgress = 0

            Log.d(TAG, "⬇️ Начало скачивания...")
            while (inputStream.read(buffer).also { count = it } != -1) {
                total += count
                outputStream.write(buffer, 0, count)

                // Обновляем прогресс (не чаще чем каждые 1%)
                if (fileLength > 0) {
                    val progress = (total * 100 / fileLength).toInt()
                    if (progress > lastProgress + 1 || progress == 100) {
                    _downloadProgress.value = DownloadProgress(
                        progress,
                        "Загрузка: ${total / 1024 / 1024} MB / ${fileLength / 1024 / 1024} MB"
                    )
                        lastProgress = progress
                        Log.d(TAG, "📊 Прогресс: $progress% ($total / $fileLength bytes)")
                    }
                }
            }

            outputStream.flush()
            outputStream.close()
            inputStream.close()
            body.close()

            val finalSize = outputFile.length()
            Log.d(TAG, "✅ APK скачан: ${outputFile.absolutePath} ($finalSize bytes)")
            
            if (finalSize == 0L) {
                throw Exception("Загруженный файл пуст")
            }
            
            if (fileLength > 0 && finalSize != fileLength) {
                Log.w(TAG, "⚠️ Размер файла не совпадает: ожидалось $fileLength, получено $finalSize")
            }
            
            outputFile
        } catch (e: Exception) {
            Log.e(TAG, "❌ Ошибка скачивания APK: ${e.message}", e)
            null
        }
    }

    /**
     * Проверить разрешение на установку APK (Android 8.0+)
     */
    fun canInstallPackages(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    /**
     * Открыть настройки для разрешения установки из неизвестных источников
     */
    fun requestInstallPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Ошибка открытия настроек установки", e)
            }
        }
    }

    /**
     * Установить APK
     */
    private fun installApk(apkFile: File) {
        try {
            Log.d(TAG, "🚀 Начало установки APK: ${apkFile.absolutePath}")
            Log.d(TAG, "📦 Файл существует: ${apkFile.exists()}, размер: ${apkFile.length()} bytes")
            
            // Проверяем разрешение на установку для Android 8.0+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !canInstallPackages()) {
                Log.w(TAG, "⚠️ Нет разрешения на установку пакетов")
                _updateCheckStatus.value = UpdateCheckStatus.Error("Требуется разрешение на установку из неизвестных источников")
                requestInstallPermission()
                return
            }

            val uri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Android 7.0+ требует FileProvider
                val fileProviderUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    apkFile
                )
                Log.d(TAG, "📎 FileProvider URI: $fileProviderUri")
                fileProviderUri
            } else {
                val fileUri = Uri.fromFile(apkFile)
                Log.d(TAG, "📎 File URI: $fileUri")
                fileUri
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                
                // Для Android 8.0+ нужно явно разрешить установку
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                }
            }

            // Проверяем, есть ли приложение для установки
            val packageManager = context.packageManager
            if (intent.resolveActivity(packageManager) != null) {
                Log.d(TAG, "✅ Найдено приложение для установки")
            context.startActivity(intent)
                Log.d(TAG, "✅ Intent установки запущен")
            } else {
                Log.e(TAG, "❌ Не найдено приложение для установки APK")
                _updateCheckStatus.value = UpdateCheckStatus.Error("Не найдено приложение для установки. Разрешите установку из неизвестных источников в настройках.")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Ошибка безопасности при установке APK", e)
            _updateCheckStatus.value = UpdateCheckStatus.Error("Ошибка безопасности: ${e.message}. Разрешите установку из неизвестных источников.")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                requestInstallPermission()
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Ошибка установки APK", e)
            _updateCheckStatus.value = UpdateCheckStatus.Error("Ошибка установки: ${e.message}")
        }
    }

    /**
     * Сбросить статус проверки
     */
    fun resetStatus() {
        _updateCheckStatus.value = UpdateCheckStatus.Idle
        _downloadProgress.value = null
    }
}

/**
 * Прогресс загрузки
 */
data class DownloadProgress(
    val progress: Int,
    val message: String
)

/**
 * Информация об обновлении
 */
data class UpdateInfo(
    val currentVersion: String,
    val newVersion: String,
    val forceUpdate: Boolean,
    val downloadUrl: String
)

/**
 * Статус проверки обновлений
 */
sealed class UpdateCheckStatus {
    object Idle : UpdateCheckStatus()
    object Checking : UpdateCheckStatus()
    object NoUpdateAvailable : UpdateCheckStatus()
    data class UpdateAvailable(val updateInfo: UpdateInfo) : UpdateCheckStatus()
    data class Error(val message: String) : UpdateCheckStatus()
}
