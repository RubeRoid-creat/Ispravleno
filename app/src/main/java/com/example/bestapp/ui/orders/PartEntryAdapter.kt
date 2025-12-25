package com.example.bestapp.ui.orders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.bestapp.R
import com.google.android.material.textfield.TextInputEditText

data class PartEntry(
    var name: String = "",
    var quantity: Int = 1,
    var cost: Double = 0.0
)

class PartEntryAdapter : RecyclerView.Adapter<PartEntryAdapter.PartViewHolder>() {
    
    var onRemove: ((Int) -> Unit)? = null

    private val parts = mutableListOf<PartEntry>()

    fun addPart() {
        parts.add(PartEntry())
        notifyItemInserted(parts.size - 1)
    }

    fun removePart(position: Int) {
        if (position >= 0 && position < parts.size) {
            parts.removeAt(position)
            notifyItemRemoved(position)
            notifyItemRangeChanged(position, parts.size - position)
        }
    }

    fun getParts(): List<PartEntry> {
        return parts.filter { it.name.trim().isNotBlank() }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PartViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_part_entry, parent, false)
        return PartViewHolder(view)
    }

    override fun onBindViewHolder(holder: PartViewHolder, position: Int) {
        holder.bind(parts[position], position)
    }

    override fun getItemCount(): Int = parts.size

    inner class PartViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val inputName: TextInputEditText = itemView.findViewById(R.id.input_part_name)
        private val inputQuantity: TextInputEditText = itemView.findViewById(R.id.input_part_quantity)
        private val inputCost: TextInputEditText = itemView.findViewById(R.id.input_part_cost)
        private val btnRemove = itemView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btn_remove_part)

        fun bind(part: PartEntry, position: Int) {
            inputName.setText(part.name)
            inputQuantity.setText(part.quantity.toString())
            inputCost.setText(if (part.cost > 0) part.cost.toString() else "")
            
            inputName.setOnFocusChangeListener { _, hasFocus ->
                if (!hasFocus) {
                    part.name = inputName.text?.toString() ?: ""
                }
            }
            
            inputQuantity.setOnFocusChangeListener { _, hasFocus ->
                if (!hasFocus) {
                    part.quantity = inputQuantity.text?.toString()?.toIntOrNull() ?: 1
                }
            }
            
            inputCost.setOnFocusChangeListener { _, hasFocus ->
                if (!hasFocus) {
                    part.cost = inputCost.text?.toString()?.toDoubleOrNull() ?: 0.0
                }
            }
            
            btnRemove.setOnClickListener {
                onRemove?.invoke(position)
            }
        }
    }
}
