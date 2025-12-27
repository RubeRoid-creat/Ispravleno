package com.bestapp.client.ui.orders

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.util.*

/**
 * Карточка для отображения выполненных работ и использованных запчастей
 */
@Composable
fun RepairWorksAndPartsCard(
    completedWorks: List<RepairDescriptionParser.ParsedWork>,
    usedParts: List<RepairDescriptionParser.ParsedPart>,
    estimatedWorks: List<RepairDescriptionParser.ParsedWork> = emptyList(),
    estimatedParts: List<RepairDescriptionParser.ParsedPart> = emptyList(),
    modifier: Modifier = Modifier
) {
    // Показываем карточку только если есть данные для отображения
    if (completedWorks.isEmpty() && usedParts.isEmpty() && estimatedWorks.isEmpty() && estimatedParts.isEmpty()) {
        return
    }
    
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Выполненные работы
            if (completedWorks.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Build,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Выполненные работы",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    completedWorks.forEachIndexed { index, work ->
                        WorkItemCard(
                            work = work,
                            index = index + 1
                        )
                    }
                    
                    // Итого по работам
                    val worksTotal = completedWorks.sumOf { it.price ?: 0.0 }
                    if (worksTotal > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Итого по работам:",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = String.format(Locale.getDefault(), "%.0f ₽", worksTotal),
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
            
            // Предполагаемые работы (если нет выполненных)
            if (completedWorks.isEmpty() && estimatedWorks.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Build,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            text = "Предполагаемые работы",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    estimatedWorks.forEachIndexed { index, work ->
                        WorkItemCard(
                            work = work,
                            index = index + 1,
                            isEstimated = true
                        )
                    }
                    
                    // Итого по предполагаемым работам
                    val estimatedWorksTotal = estimatedWorks.sumOf { it.price ?: 0.0 }
                    if (estimatedWorksTotal > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Итого по работам:",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = String.format(Locale.getDefault(), "%.0f ₽", estimatedWorksTotal),
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }
                }
            }
            
            // Использованные запчасти
            if (usedParts.isNotEmpty()) {
                if (completedWorks.isNotEmpty() || estimatedWorks.isNotEmpty()) {
                    Divider()
                }
                
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Использованные запчасти",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    usedParts.forEachIndexed { index, part ->
                        PartItemCard(
                            part = part,
                            index = index + 1
                        )
                    }
                    
                    // Итого по запчастям
                    val partsTotal = usedParts.sumOf { it.totalPrice ?: 0.0 }
                    if (partsTotal > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Итого по запчастям:",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = String.format(Locale.getDefault(), "%.0f ₽", partsTotal),
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
            
            // Предполагаемые запчасти (если нет использованных)
            if (usedParts.isEmpty() && estimatedParts.isNotEmpty()) {
                if (completedWorks.isNotEmpty() || estimatedWorks.isNotEmpty()) {
                    Divider()
                }
                
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            text = "Предполагаемые запчасти",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    estimatedParts.forEachIndexed { index, part ->
                        PartItemCard(
                            part = part,
                            index = index + 1,
                            isEstimated = true
                        )
                    }
                    
                    // Итого по предполагаемым запчастям
                    val estimatedPartsTotal = estimatedParts.sumOf { it.totalPrice ?: 0.0 }
                    if (estimatedPartsTotal > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Итого по запчастям:",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = String.format(Locale.getDefault(), "%.0f ₽", estimatedPartsTotal),
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }
                }
            }
            
            // Общая сумма (если есть выполненные работы или запчасти)
            val totalCost = (completedWorks.sumOf { it.price ?: 0.0 } + usedParts.sumOf { it.totalPrice ?: 0.0 })
            if (totalCost > 0) {
                Divider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Общая стоимость:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = String.format(Locale.getDefault(), "%.0f ₽", totalCost),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun WorkItemCard(
    work: RepairDescriptionParser.ParsedWork,
    index: Int,
    isEstimated: Boolean = false
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "$index.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = work.name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isEstimated) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                )
            }
            if (work.price != null) {
                Text(
                    text = String.format(Locale.getDefault(), "%.0f ₽", work.price),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isEstimated) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun PartItemCard(
    part: RepairDescriptionParser.ParsedPart,
    index: Int,
    isEstimated: Boolean = false
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "$index.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = part.name,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isEstimated) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                    )
                }
                Text(
                    text = "${part.quantity} ${part.unit}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (part.totalPrice != null) {
                Text(
                    text = String.format(Locale.getDefault(), "%.0f ₽", part.totalPrice),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isEstimated) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
