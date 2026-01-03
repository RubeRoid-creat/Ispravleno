package com.bestapp.client.services

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import com.bestapp.client.data.api.models.VersionCheckResponse
import com.bestapp.client.data.repository.ApiRepository
import com.bestapp.client.data.repository.ApiResult
import com.bestapp.client.di.AppContainer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Сервис обновлений приложения
 * Скачивает и устанавливает APK напрямую с сервера
 */
class UpdateService(private val context: Context) {
    
    companion object {
        private const val TAG = "UpdateService"
        private const val UPDATE_FILE_NAME = "app-update.apk"
    }
    
    private val apiRepository: ApiRepository = AppContainer.apiRepository
    
    suspend fun checkForUpdate(currentVersion: String): ApiResult<VersionCheckResponse> {
        return withContext(Dispatchers.IO) {
            apiRepository.checkVersion(currentVersion)
        }
    }
    
    /**
     * Скачать APK файл
     */
    fun downloadUpdate(downloadUrl: String): Flow<DownloadProgress> {
        return flow {
            try {
                Log.d(TAG, "🚀 Начало загрузки APK: $downloadUrl")
                emit(DownloadProgress.Progress(0))
                
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
                val response = withContext(Dispatchers.IO) {
                    client.newCall(request).execute()
                }
                
                if (!response.isSuccessful) {
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
                            emit(DownloadProgress.Progress(progress))
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
                
                emit(DownloadProgress.Success(outputFile))
            } catch (e: Exception) {
                Log.e(TAG, "❌ Ошибка скачивания APK: ${e.message}", e)
                emit(DownloadProgress.Error(e.message ?: "Ошибка загрузки"))
            }
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
    fun installApk(apkFile: File) {
        try {
            Log.d(TAG, "🚀 Начало установки APK: ${apkFile.absolutePath}")
            Log.d(TAG, "📦 Файл существует: ${apkFile.exists()}, размер: ${apkFile.length()} bytes")
            
            // Проверяем разрешение на установку для Android 8.0+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !canInstallPackages()) {
                Log.w(TAG, "⚠️ Нет разрешения на установку пакетов")
                requestInstallPermission()
                throw Exception("Требуется разрешение на установку из неизвестных источников. Откройте настройки и разрешите установку.")
            }
            
                val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
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
                throw Exception("Не найдено приложение для установки. Разрешите установку из неизвестных источников в настройках.")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Ошибка безопасности при установке APK", e)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                requestInstallPermission()
            }
            throw Exception("Ошибка безопасности: ${e.message}. Разрешите установку из неизвестных источников.")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Ошибка установки APK", e)
            throw e
        }
    }
}

sealed class DownloadProgress {
    data class Progress(val percent: Int) : DownloadProgress()
    data class Success(val file: File) : DownloadProgress()
    data class Error(val message: String) : DownloadProgress()
}

