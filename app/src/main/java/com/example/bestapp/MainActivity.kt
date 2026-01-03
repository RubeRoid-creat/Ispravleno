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
import com.example.bestapp.ui.update.UpdateViewModel
import com.example.bestapp.ui.update.UpdateDialogFragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.yandex.mapkit.MapKitFactory
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.example.bestapp.api.ApiRepository
import com.example.bestapp.api.RetrofitClient
import com.example.bestapp.updates.UpdateManager
import com.example.bestapp.updates.UpdateCheckStatus
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var navController: NavController
    private lateinit var bottomNav: BottomNavigationView
    private val authViewModel: AuthViewModel by viewModels()
    private lateinit var updateManager: UpdateManager
    private lateinit var updateViewModel: UpdateViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // MapKit уже инициализирован в BestApp
        
        setContentView(R.layout.activity_main)
        setupNavigation()
        setupAuth()
        checkServerConnection()
        
        // Инициализация менеджера обновлений
        updateManager = UpdateManager(this, lifecycleScope)
        updateViewModel = ViewModelProvider(this)[UpdateViewModel::class.java]
        setupUpdateObserver()
        setupUpdateDialogObserver()
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
        // Используем UpdateViewModel для проверки обновлений
        updateViewModel.checkForUpdate()
    }
    
    /**
     * Наблюдатель за диалогом обновления
     */
    private fun setupUpdateDialogObserver() {
        lifecycleScope.launch {
            updateViewModel.uiState.collect { state ->
                if (state.showUpdateDialog && state.versionInfo != null) {
                    // Показываем диалог обновления
                    val dialog = UpdateDialogFragment()
                    dialog.show(supportFragmentManager, "UpdateDialog")
                }
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
                    is UpdateCheckStatus.UpdateAvailable -> {
                        // Автоматически начинаем скачивание
                        updateManager.downloadAndInstall(status.updateInfo.downloadUrl)
                    }
                    is UpdateCheckStatus.Error -> {
                        Log.e("MainActivity", "Update error: ${status.message}")
                        MaterialAlertDialogBuilder(this@MainActivity)
                            .setTitle("Ошибка обновления")
                            .setMessage(status.message)
                            .setPositiveButton("OK", null)
                            .show()
                    }
                    else -> {
                        // Другие статусы логируем
                        Log.d("MainActivity", "Update status: $status")
                    }
            }
        }
    }
    
        // Отслеживаем прогресс загрузки
        lifecycleScope.launch {
            updateManager.downloadProgress.collect { progress ->
                progress?.let {
                    Log.d("MainActivity", "Download progress: ${it.progress}% - ${it.message}")
                }
            }
        }
    }
    
}