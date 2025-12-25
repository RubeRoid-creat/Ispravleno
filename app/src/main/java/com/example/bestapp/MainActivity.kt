package com.example.bestapp

import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.example.bestapp.ui.auth.AuthViewModel
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.yandex.mapkit.MapKitFactory
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.example.bestapp.api.ApiRepository
import com.example.bestapp.api.RetrofitClient
import com.example.bestapp.updates.UpdateManager
import com.example.bestapp.updates.UpdateCheckStatus
import kotlinx.coroutines.launch
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : AppCompatActivity() {
    private lateinit var navController: NavController
    private lateinit var bottomNav: BottomNavigationView
    private val authViewModel: AuthViewModel by viewModels()
    private lateinit var updateManager: UpdateManager
    
    // Launcher для In-App Updates
    private val updateLauncher = registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            Log.d("MainActivity", "✅ Обновление успешно установлено")
        } else {
            Log.d("MainActivity", "⚠️ Обновление отменено или не завершено")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // MapKit уже инициализирован в BestApp
        
        setContentView(R.layout.activity_main)
        setupNavigation()
        setupAuth()
        checkServerConnection()
        
        // Инициализация менеджера обновлений
        updateManager = UpdateManager(this, lifecycleScope)
        setupUpdateObserver()
        checkAppVersion()
    }
    
    private fun checkServerConnection() {
        lifecycleScope.launch {
            try {
                Log.d("MainActivity", "Проверка подключения к серверу...")
                val (isAvailable, message) = RetrofitClient.checkServerAvailability()
                if (!isAvailable) {
                    Log.e("MainActivity", "❌ Сервер недоступен: $message")
                    // Показываем предупреждение только в логах, чтобы не мешать пользователю
                    // При реальных запросах пользователь увидит понятное сообщение об ошибке
                } else {
                    Log.d("MainActivity", "✅ $message")
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Ошибка проверки подключения к серверу", e)
            }
        }
    }
    
    private fun setupAuth() {
        // Автоматический логин отключен - пользователь должен входить вручную
        // Для тестирования можно раскомментировать код ниже:
        /*
        lifecycleScope.launch {
            authViewModel.isLoggedIn.collect { isLoggedIn ->
                if (!isLoggedIn) {
                    Log.d("MainActivity", "Auto-login as master...")
                    authViewModel.quickLoginAsMaster(0)
                }
            }
        }
        */
    }

    override fun onStart() {
        super.onStart()
        MapKitFactory.getInstance().onStart()
    }

    override fun onStop() {
        MapKitFactory.getInstance().onStop()
        super.onStop()
    }

    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHostFragment.navController
        bottomNav = findViewById(R.id.bottom_navigation)
        
        // Настраиваем отображение всех элементов меню
        bottomNav.menu.clear()
        bottomNav.inflateMenu(R.menu.bottom_navigation_menu)
        bottomNav.setupWithNavController(navController)
        
        navController.addOnDestinationChangedListener { _, destination, _ ->
            when (destination.id) {
                R.id.splashFragment,
                R.id.loginFragment,
                R.id.registrationFragment,
                R.id.onboardingFragment,
                R.id.citySelectionFragment -> {
                    bottomNav.visibility = View.GONE
                }
                else -> {
                    bottomNav.visibility = View.VISIBLE
                }
            }
        }
    }
    
    private fun checkAppVersion() {
        lifecycleScope.launch {
            try {
                val repo = ApiRepository()
                val packageInfo = packageManager.getPackageInfo(packageName, 0)
                val appVersion = packageInfo.versionName ?: "1.0.0"
                @Suppress("DEPRECATION")
                val buildVersion = packageInfo.versionCode
                val osVersion = android.os.Build.VERSION.RELEASE ?: "unknown"
                val platform = "android_master"
                
                val result = repo.checkAppVersion(
                    platform = platform,
                    appVersion = appVersion,
                    buildVersion = buildVersion,
                    osVersion = osVersion
                )
                
                result.onSuccess { data ->
                    if (data.updateRequired) {
                        // Пытаемся использовать In-App Updates
                        val inAppUpdateSuccess = updateManager.checkInAppUpdate(
                            activity = this@MainActivity,
                            forceUpdate = data.forceUpdate
                        )
                        
                        // Если In-App Updates не сработал, показываем обычный диалог
                        if (!inAppUpdateSuccess) {
                            showUpdateDialog(
                                force = data.forceUpdate,
                                currentVersion = data.currentVersion,
                                releaseNotes = data.releaseNotes ?: "",
                                downloadUrl = data.downloadUrl
                            )
                        }
                    }
                }.onFailure { e ->
                    Log.e("MainActivity", "Version check failed: ${e.message}")
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Version check error", e)
            }
        }
    }
    
    /**
     * Наблюдатель за статусом обновлений
     */
    private fun setupUpdateObserver() {
        lifecycleScope.launch {
            updateManager.updateCheckStatus.collect { status ->
                when (status) {
                    is UpdateCheckStatus.UpdateDownloaded -> {
                        // Показываем уведомление о готовности обновления
                        showUpdateReadyDialog()
                    }
                    is UpdateCheckStatus.Error -> {
                        Log.e("MainActivity", "Update error: ${status.message}")
                    }
                    else -> {
                        // Другие статусы логируем
                        Log.d("MainActivity", "Update status: $status")
                    }
                }
            }
        }
    }
    
    /**
     * Показать диалог о готовности обновления (для гибких обновлений)
     */
    private fun showUpdateReadyDialog() {
        MaterialAlertDialogBuilder(this)
            .setTitle("Обновление готово")
            .setMessage("Обновление скачано и готово к установке. Перезапустить приложение?")
            .setPositiveButton("Перезапустить") { _, _ ->
                updateManager.completeFlexibleUpdate(this)
            }
            .setNegativeButton("Позже", null)
            .show()
    }
    
    override fun onResume() {
        super.onResume()
        // Проверяем, не было ли прервано обновление (для гибких обновлений)
        lifecycleScope.launch {
            try {
                updateManager.appUpdateManager.appUpdateInfo.addOnSuccessListener { appUpdateInfo ->
                    if (appUpdateInfo.installStatus() == com.google.android.play.core.install.model.InstallStatus.DOWNLOADED) {
                        showUpdateReadyDialog()
                    }
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Error checking update status", e)
            }
        }
    }
    
    private fun showUpdateDialog(
        force: Boolean,
        currentVersion: String,
        releaseNotes: String,
        downloadUrl: String?
    ) {
        val builder = MaterialAlertDialogBuilder(this)
            .setTitle("Доступно обновление")
            .setMessage("Новая версия $currentVersion\n\n$releaseNotes")
        
        if (force) {
            builder.setCancelable(false)
                .setPositiveButton("Обновить") { _, _ ->
                    openStore(downloadUrl)
                }
        } else {
            builder.setPositiveButton("Обновить") { _, _ ->
                openStore(downloadUrl)
            }.setNegativeButton("Позже", null)
        }
        
        builder.show()
    }
    
    private fun openStore(url: String?) {
        try {
            val intent = android.content.Intent(
                android.content.Intent.ACTION_VIEW,
                android.net.Uri.parse(url ?: "market://details?id=${packageName}")
            )
            startActivity(intent)
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to open store", e)
        }
    }
}