package com.example.bestapp.ui.update

import android.app.Application
import android.content.pm.PackageManager
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.bestapp.api.ApiRepository
import com.example.bestapp.api.models.VersionCheckResponse
import com.example.bestapp.updates.UpdateManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class UpdateUiState(
    val isLoading: Boolean = false,
    val versionInfo: VersionCheckResponse? = null,
    val showUpdateDialog: Boolean = false,
    val isDownloading: Boolean = false,
    val downloadProgress: Int = 0,
    val downloadMessage: String = "",
    val errorMessage: String? = null
)

class UpdateViewModel(application: Application) : AndroidViewModel(application) {
    
    private val apiRepository = ApiRepository()
    private val updateManager = UpdateManager(application, viewModelScope)
    private val _uiState = MutableStateFlow(UpdateUiState())
    val uiState: StateFlow<UpdateUiState> = _uiState.asStateFlow()
    
    init {
        // Наблюдаем за прогрессом загрузки
        viewModelScope.launch {
            updateManager.downloadProgress.collect { progress ->
                progress?.let {
                    _uiState.value = _uiState.value.copy(
                        isDownloading = true,
                        downloadProgress = it.progress,
                        downloadMessage = it.message
                    )
                }
            }
        }
        
        // Наблюдаем за статусом обновлений
        viewModelScope.launch {
            updateManager.updateCheckStatus.collect { status ->
                when (status) {
                    is com.example.bestapp.updates.UpdateCheckStatus.UpdateAvailable -> {
                        _uiState.value = _uiState.value.copy(
                            isDownloading = false,
                            downloadProgress = 0
                        )
                        // Установка запущена через UpdateManager
                    }
                    is com.example.bestapp.updates.UpdateCheckStatus.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isDownloading = false,
                            errorMessage = status.message
                        )
                    }
                    else -> {
                        // Другие статусы
                    }
                }
            }
        }
    }
    
    fun checkForUpdate() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                val currentVersion = getAppVersion()
                android.util.Log.d("UpdateViewModel", "🔍 Проверка обновлений. Текущая версия: $currentVersion")
                
                val result = apiRepository.checkAppVersion(
                    platform = "android_master",
                    appVersion = currentVersion,
                    buildVersion = getAppVersionCode(),
                    osVersion = Build.VERSION.SDK_INT.toString()
                )
                
                result.onSuccess { data ->
                    android.util.Log.d("UpdateViewModel", "✅ Ответ API: updateRequired=${data.updateRequired}, currentVersion=${data.currentVersion}, downloadUrl=${data.downloadUrl}")
                    if (data.updateRequired && data.downloadUrl != null) {
                        android.util.Log.d("UpdateViewModel", "📢 Показываем диалог обновления")
                        _uiState.value = _uiState.value.copy(
                            versionInfo = data,
                            showUpdateDialog = true,
                            isLoading = false
                        )
                    } else {
                        android.util.Log.d("UpdateViewModel", "ℹ️ Обновление не требуется или URL отсутствует")
                        _uiState.value = _uiState.value.copy(isLoading = false)
                    }
                }.onFailure { e ->
                    android.util.Log.e("UpdateViewModel", "❌ Ошибка проверки обновлений: ${e.message}", e)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = e.message ?: "Ошибка проверки обновлений"
                    )
                }
            } catch (e: Exception) {
                android.util.Log.e("UpdateViewModel", "❌ Исключение при проверке обновлений: ${e.message}", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Ошибка проверки обновлений"
                )
            }
        }
    }
    
    fun startUpdate() {
        val downloadUrl = _uiState.value.versionInfo?.downloadUrl
        if (downloadUrl.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "URL загрузки не указан"
            )
            return
        }
        
        _uiState.value = _uiState.value.copy(
            isDownloading = true,
            downloadProgress = 0,
            downloadMessage = "Начало загрузки..."
        )
        
        // Проверяем разрешение на установку для Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !updateManager.canInstallPackages()) {
            _uiState.value = _uiState.value.copy(
                isDownloading = false,
                errorMessage = "Требуется разрешение на установку из неизвестных источников"
            )
            updateManager.requestInstallPermission()
            return
        }
        
        updateManager.downloadAndInstall(downloadUrl)
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
    
    private fun getAppVersionCode(): Int {
        return try {
            val packageInfo = getApplication<Application>().packageManager
                .getPackageInfo(getApplication<Application>().packageName, 0)
            @Suppress("DEPRECATION")
            packageInfo.versionCode
        } catch (e: PackageManager.NameNotFoundException) {
            0
        }
    }
}
