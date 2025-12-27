package com.bestapp.client.ui.orders

import com.bestapp.client.data.api.models.PriceDto

data class SelectedWork(
    val priceItemId: Long,
    val name: String,
    val price: Double,
    val description: String? = null
) {
    constructor(price: PriceDto) : this(
        priceItemId = price.id,
        name = price.name,
        price = price.price,
        description = price.description
    )
}

data class SelectedPart(
    val priceItemId: Long,
    val name: String,
    val price: Double,
    var quantity: Int = 1,
    val description: String? = null,
    val unit: String? = "шт"
) {
    constructor(price: PriceDto, quantity: Int = 1) : this(
        priceItemId = price.id,
        name = price.name,
        price = price.price,
        quantity = quantity,
        description = price.description,
        unit = price.unit
    )
    
    val totalPrice: Double
        get() = price * quantity
}
