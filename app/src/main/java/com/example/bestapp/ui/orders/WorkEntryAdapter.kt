package com.example.bestapp.ui.orders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.bestapp.R
import com.example.bestapp.api.models.ApiPrice
import com.google.android.material.textfield.TextInputEditText
import java.util.Locale

data class WorkEntry(
    var description: String = "",
    var priceItemId: Long? = null, // ID из прайса (если выбрано из прайса)
    var price: Double? = null // Цена из прайса
) {
    constructor(priceItem: ApiPrice) : this(
        description = priceItem.name,
        priceItemId = priceItem.id,
        price = priceItem.price
    )
}

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

    fun getWorks(): List<WorkEntry> {
        return works.filter { it.description.trim().isNotBlank() }
    }
    
    fun addWorkFromPrice(priceItem: ApiPrice) {
        works.add(WorkEntry(priceItem))
        notifyItemInserted(works.size - 1)
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
        private val textWorkName: TextView = itemView.findViewById(R.id.text_work_name)
        private val textWorkPrice: TextView = itemView.findViewById(R.id.text_work_price)
        private val btnRemove = itemView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btn_remove_work)

        fun bind(work: WorkEntry, position: Int) {
            textWorkName.text = work.description
            textWorkPrice.text = if (work.price != null) {
                String.format(Locale.getDefault(), "%.0f ₽", work.price)
            } else {
                ""
            }
            
            btnRemove.setOnClickListener {
                onRemove?.invoke(position)
            }
        }
    }
}
