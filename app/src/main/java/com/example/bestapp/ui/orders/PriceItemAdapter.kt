package com.example.bestapp.ui.orders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.bestapp.R
import com.example.bestapp.api.models.ApiPrice
import com.google.android.material.chip.Chip
import java.util.Locale

class PriceItemAdapter(
    private val onItemClick: (ApiPrice) -> Unit,
    private val selectedItems: Set<Long> = emptySet()
) : RecyclerView.Adapter<PriceItemAdapter.PriceItemViewHolder>() {

    private var prices = mutableListOf<ApiPrice>()

    fun updatePrices(newPrices: List<ApiPrice>) {
        prices.clear()
        prices.addAll(newPrices)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PriceItemViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.dialog_select_price_item, parent, false)
        return PriceItemViewHolder(view)
    }

    override fun onBindViewHolder(holder: PriceItemViewHolder, position: Int) {
        holder.bind(prices[position], selectedItems.contains(prices[position].id))
    }

    override fun getItemCount(): Int = prices.size

    inner class PriceItemViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val textItemName: TextView = itemView.findViewById(R.id.text_item_name)
        private val textItemCategory: TextView = itemView.findViewById(R.id.text_item_category)
        private val textItemDescription: TextView = itemView.findViewById(R.id.text_item_description)
        private val textItemPrice: TextView = itemView.findViewById(R.id.text_item_price)
        private val chipSelected: Chip = itemView.findViewById(R.id.chip_selected)

        fun bind(price: ApiPrice, isSelected: Boolean) {
            textItemName.text = price.name
            textItemCategory.text = price.category
            textItemDescription.text = price.description ?: ""
            textItemPrice.text = String.format(Locale.getDefault(), "%.0f ₽", price.price)
            
            chipSelected.visibility = if (isSelected) View.VISIBLE else View.GONE
            
            itemView.setOnClickListener {
                onItemClick(price)
            }
        }
    }
}
