package com.bestapp.client.ui.update

import android.app.Application
import android.content.pm.PackageManager
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.catch
import com.bestapp.client.data.api.models.VersionCheckResponse
import com.bestapp.client.services.DownloadProgress
import com.bestapp.client.services.UpdateService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

data class UpdateUiState(
    val isLoading: Boolean = false,
    val versionInfo: VersionCheckResponse? = null,
    val showUpdateDialog: Boolean = false,
    val isDownloading: Boolean = false,
    val downloadProgress: Int = 0,
    val errorMessage: String? = null
)

class UpdateViewModel(application: Application) : AndroidViewModel(application) {
    
    private val updateService = UpdateService(application)
    private val _uiState = MutableStateFlow(UpdateUiState())
    val uiState: StateFlow<UpdateUiState> = _uiState.asStateFlow()
    
    fun checkForUpdate() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                val currentVersion = getAppVersion()
                android.util.Log.d("UpdateViewModel", "Checking for update. Current version: $currentVersion")
                
                when (val result = updateService.checkForUpdate(currentVersion)) {
                    is com.bestapp.client.data.repository.ApiResult.Success -> {
                        android.util.Log.d("UpdateViewModel", "Update check result: updateRequired=${result.data.updateRequired}, currentVersion=${result.data.currentVersion}")
                        if (result.data.updateRequired) {
                            _uiState.value = _uiState.value.copy(
                                versionInfo = result.data,
                                showUpdateDialog = true,
                                isLoading = false
                            )
                            android.util.Log.d("UpdateViewModel", "Update dialog will be shown")
                        } else {
                            android.util.Log.d("UpdateViewModel", "No update required")
                            _uiState.value = _uiState.value.copy(isLoading = false)
                        }
                    }
                    is com.bestapp.client.data.repository.ApiResult.Error -> {
                        android.util.Log.e("UpdateViewModel", "Update check error: ${result.message}")
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            errorMessage = result.message
                        )
                    }
                    else -> {
                        android.util.Log.d("UpdateViewModel", "Update check: Loading state")
                        _uiState.value = _uiState.value.copy(isLoading = false)
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("UpdateViewModel", "Update check exception", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message
                )
            }
        }
    }
    
    fun startUpdate() {
        android.util.Log.d("UpdateViewModel", "🚀 startUpdate() вызван")
        val downloadUrl = _uiState.value.versionInfo?.downloadUrl
        android.util.Log.d("UpdateViewModel", "📥 downloadUrl: $downloadUrl")
        
        if (downloadUrl.isNullOrBlank()) {
            android.util.Log.e("UpdateViewModel", "❌ URL загрузки не указан")
            _uiState.value = _uiState.value.copy(
                errorMessage = "URL загрузки не указан"
            )
            return
        }
        
        android.util.Log.d("UpdateViewModel", "✅ Начинаем загрузку с URL: $downloadUrl")
        _uiState.value = _uiState.value.copy(isDownloading = true, downloadProgress = 0, errorMessage = null)
        
        viewModelScope.launch {
            try {
                android.util.Log.d("UpdateViewModel", "📡 Запуск downloadUpdate...")
            updateService.downloadUpdate(downloadUrl)
                .catch { e ->
                        android.util.Log.e("UpdateViewModel", "❌ Ошибка в Flow: ${e.message}", e)
                    _uiState.value = _uiState.value.copy(
                        isDownloading = false,
                        errorMessage = e.message ?: "Ошибка загрузки"
                    )
                }
                .collect { progress ->
                        android.util.Log.d("UpdateViewModel", "📊 Получен прогресс: $progress")
                    when (progress) {
                        is DownloadProgress.Progress -> {
                                android.util.Log.d("UpdateViewModel", "📈 Прогресс: ${progress.percent}%")
                            _uiState.value = _uiState.value.copy(
                                downloadProgress = progress.percent
                            )
                        }
                        is DownloadProgress.Success -> {
                                android.util.Log.d("UpdateViewModel", "✅ Загрузка завершена: ${progress.file.absolutePath}")
                            _uiState.value = _uiState.value.copy(
                                isDownloading = false,
                                downloadProgress = 100
                            )
                            try {
                                    // Проверяем разрешение на установку для Android 8.0+
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !updateService.canInstallPackages()) {
                                        android.util.Log.w("UpdateViewModel", "⚠️ Нет разрешения на установку")
                                        _uiState.value = _uiState.value.copy(
                                            errorMessage = "Требуется разрешение на установку из неизвестных источников"
                                        )
                                        updateService.requestInstallPermission()
                                    } else {
                                        android.util.Log.d("UpdateViewModel", "🚀 Начинаем установку APK")
                                updateService.installApk(progress.file)
                                    }
                            } catch (e: Exception) {
                                    android.util.Log.e("UpdateViewModel", "❌ Ошибка установки: ${e.message}", e)
                                _uiState.value = _uiState.value.copy(
                                    errorMessage = "Ошибка установки: ${e.message}"
                                )
                            }
                        }
                        is DownloadProgress.Error -> {
                                android.util.Log.e("UpdateViewModel", "❌ Ошибка загрузки: ${progress.message}")
                            _uiState.value = _uiState.value.copy(
                                isDownloading = false,
                                errorMessage = progress.message
                            )
                        }
                    }
                    }
            } catch (e: Exception) {
                android.util.Log.e("UpdateViewModel", "❌ Исключение при загрузке: ${e.message}", e)
                _uiState.value = _uiState.value.copy(
                    isDownloading = false,
                    errorMessage = "Ошибка: ${e.message}"
                )
                }
        }
    }
    
    fun dismissDialog() {
        _uiState.value = _uiState.value.copy(showUpdateDialog = false)
    }
    
    
    private fun getAppVersion(): String {
        return try {
            val packageInfo = getApplication<Application>().packageManager
                .getPackageInfo(getApplication<Application>().packageName, 0)
            packageInfo.versionName ?: "1.0.0"
        } catch (e: PackageManager.NameNotFoundException) {
            "1.0.0"
        }
    }
}
