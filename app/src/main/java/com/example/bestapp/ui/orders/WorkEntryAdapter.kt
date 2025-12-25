package com.example.bestapp.ui.orders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.bestapp.R
import com.google.android.material.textfield.TextInputEditText

data class WorkEntry(
    var description: String = ""
)

class WorkEntryAdapter : RecyclerView.Adapter<WorkEntryAdapter.WorkViewHolder>() {
    
    var onRemove: ((Int) -> Unit)? = null

    private val works = mutableListOf<WorkEntry>()

    fun addWork(description: String = "") {
        works.add(WorkEntry(description))
        notifyItemInserted(works.size - 1)
    }

    fun removeWork(position: Int) {
        if (position >= 0 && position < works.size) {
            works.removeAt(position)
            notifyItemRemoved(position)
            notifyItemRangeChanged(position, works.size - position)
        }
    }

    fun getWorks(): List<String> {
        return works.map { it.description.trim() }.filter { it.isNotBlank() }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WorkViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_work_entry, parent, false)
        return WorkViewHolder(view)
    }

    override fun onBindViewHolder(holder: WorkViewHolder, position: Int) {
        holder.bind(works[position], position)
    }

    override fun getItemCount(): Int = works.size

    inner class WorkViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val inputDescription: TextInputEditText = itemView.findViewById(R.id.input_work_description)
        private val btnRemove = itemView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btn_remove_work)

        fun bind(work: WorkEntry, position: Int) {
            inputDescription.setText(work.description)
            
            inputDescription.setOnFocusChangeListener { _, hasFocus ->
                if (!hasFocus) {
                    work.description = inputDescription.text?.toString() ?: ""
                }
            }
            
            btnRemove.setOnClickListener {
                onRemove?.invoke(position)
            }
        }
    }
}
