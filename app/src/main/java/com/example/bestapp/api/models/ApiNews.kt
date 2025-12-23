package com.example.bestapp.api.models

import com.google.gson.annotations.SerializedName

data class ApiNews(
    val id: Long,
    val title: String,
    val summary: String?,
    val content: String,
    @SerializedName("image_url") val imageUrl: String?,
    val category: String?,
    @SerializedName("is_active") val isActive: Int,
    @SerializedName("published_at") val publishedAt: String,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("updated_at") val updatedAt: String
)
