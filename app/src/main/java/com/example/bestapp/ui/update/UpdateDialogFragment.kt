package com.example.bestapp.ui.update

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.ViewModelProvider
import com.example.bestapp.R
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class UpdateDialogFragment : DialogFragment() {
    
    private var rootView: View? = null
    
    private val viewModel: UpdateViewModel by viewModels(
        ownerProducer = { requireActivity() }
    ) {
        ViewModelProvider.AndroidViewModelFactory.getInstance(requireActivity().application)
    }
    
    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = super.onCreateDialog(savedInstanceState)
        dialog.window?.requestFeature(Window.FEATURE_NO_TITLE)
        return dialog
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        rootView = inflater.inflate(R.layout.dialog_update, container, false)
        return rootView!!
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupObservers()
        setupClickListeners()
    }
    
    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                state.versionInfo?.let { versionInfo ->
                    updateUI(versionInfo, state)
                }
            }
        }
    }
    
    private fun updateUI(versionInfo: com.example.bestapp.api.models.VersionCheckResponse, state: UpdateUiState) {
        rootView?.let { view ->
            val titleText = view.findViewById<TextView>(R.id.titleText)
            val versionText = view.findViewById<TextView>(R.id.versionText)
            val releaseNotesText = view.findViewById<TextView>(R.id.releaseNotesText)
            val progressBar = view.findViewById<ProgressBar>(R.id.progressBar)
            val progressText = view.findViewById<TextView>(R.id.progressText)
            val errorText = view.findViewById<TextView>(R.id.errorText)
            val updateButton = view.findViewById<MaterialButton>(R.id.updateButton)
            val laterButton = view.findViewById<MaterialButton>(R.id.laterButton)
            
            titleText.text = "Доступно обновление"
            versionText.text = "Новая версия: ${versionInfo.currentVersion}"
            
            if (!versionInfo.releaseNotes.isNullOrBlank()) {
                releaseNotesText.text = versionInfo.releaseNotes
                releaseNotesText.visibility = View.VISIBLE
            } else {
                releaseNotesText.visibility = View.GONE
            }
            
            // Прогресс загрузки
            if (state.isDownloading) {
                progressBar.visibility = View.VISIBLE
                progressBar.progress = state.downloadProgress
                progressText.text = state.downloadMessage.ifBlank { "Загрузка: ${state.downloadProgress}%" }
                progressText.visibility = View.VISIBLE
                updateButton.isEnabled = false
                updateButton.text = "Загрузка..."
            } else {
                progressBar.visibility = View.GONE
                progressText.visibility = View.GONE
                updateButton.isEnabled = true
                updateButton.text = "Обновить"
            }
            
            // Ошибка
            if (state.errorMessage != null) {
                errorText.text = state.errorMessage
                errorText.visibility = View.VISIBLE
            } else {
                errorText.visibility = View.GONE
            }
            
            // Кнопка "Позже" только если не принудительное обновление
            if (versionInfo.forceUpdate) {
                laterButton.visibility = View.GONE
                isCancelable = false
            } else {
                laterButton.visibility = View.VISIBLE
                isCancelable = true
            }
        }
    }
    
    private fun setupClickListeners() {
        rootView?.let { view ->
            val updateButton = view.findViewById<MaterialButton>(R.id.updateButton)
            val laterButton = view.findViewById<MaterialButton>(R.id.laterButton)
            
            updateButton.setOnClickListener {
                viewModel.startUpdate()
            }
            
            laterButton.setOnClickListener {
                viewModel.dismissDialog()
                dismiss()
            }
        }
        
        // Закрываем диалог при изменении состояния
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                if (!state.showUpdateDialog) {
                    dismiss()
                }
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        rootView = null
    }
}
