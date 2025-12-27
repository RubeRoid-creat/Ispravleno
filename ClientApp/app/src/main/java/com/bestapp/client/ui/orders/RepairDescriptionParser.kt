package com.bestapp.client.ui.orders

import java.util.*
import java.util.regex.Pattern

/**
 * Парсит описание ремонта для извлечения выполненных работ и использованных запчастей
 */
object RepairDescriptionParser {
    
    data class ParsedWork(
        val name: String,
        val price: Double?
    )
    
    data class ParsedPart(
        val name: String,
        val quantity: Int,
        val unit: String,
        val totalPrice: Double?
    )
    
    data class ParsedRepairDescription(
        val completedWorks: List<ParsedWork>,
        val usedParts: List<ParsedPart>,
        val additionalComments: String?,
        val estimatedWorks: List<ParsedWork>,
        val estimatedParts: List<ParsedPart>,
        val originalDescription: String?
    )
    
    /**
     * Парсит описание ремонта (repairDescription) или проблему (problemDescription)
     */
    fun parseDescription(description: String?): ParsedRepairDescription {
        if (description.isNullOrBlank()) {
            return ParsedRepairDescription(
                completedWorks = emptyList(),
                usedParts = emptyList(),
                additionalComments = null,
                estimatedWorks = emptyList(),
                estimatedParts = emptyList(),
                originalDescription = null
            )
        }
        
        val completedWorks = mutableListOf<ParsedWork>()
        val usedParts = mutableListOf<ParsedPart>()
        val estimatedWorks = mutableListOf<ParsedWork>()
        val estimatedParts = mutableListOf<ParsedPart>()
        var additionalComments: String? = null
        
        val lines = description.lines()
        var currentSection: String? = null
        var additionalStartIndex = -1
        
        // Паттерн для работы: "1. Название (1500 ₽)" или "1. Название"
        val workPattern = Pattern.compile("^\\d+\\.\\s+(.+?)(?:\\s+\\(([\\d\\s,]+)\\s*₽\\))?$", Pattern.CASE_INSENSITIVE)
        
        // Паттерн для запчасти: "1. Название - 2 шт. (500 ₽)" или "1. Название - 2 шт."
        val partPattern = Pattern.compile("^\\d+\\.\\s+(.+?)\\s+-\\s+(\\d+)\\s+(\\w+)(?:\\s+\\(([\\d\\s,]+)\\s*₽\\))?$", Pattern.CASE_INSENSITIVE)
        
        for (i in lines.indices) {
            val line = lines[i].trim()
            if (line.isBlank()) continue
            
            when {
                line.equals("Выполненные работы:", ignoreCase = true) -> {
                    currentSection = "completed_works"
                    continue
                }
                line.equals("Использованные запчасти:", ignoreCase = true) -> {
                    currentSection = "used_parts"
                    continue
                }
                line.equals("Предполагаемые работы:", ignoreCase = true) -> {
                    currentSection = "estimated_works"
                    continue
                }
                line.equals("Предполагаемые запчасти:", ignoreCase = true) -> {
                    currentSection = "estimated_parts"
                    continue
                }
                line.equals("Дополнительно:", ignoreCase = true) -> {
                    currentSection = "additional"
                    additionalStartIndex = i + 1
                    break
                }
            }
            
            when (currentSection) {
                "completed_works" -> {
                    val matcher = workPattern.matcher(line)
                    if (matcher.matches()) {
                        val name = matcher.group(1)?.trim() ?: ""
                        val priceStr = matcher.group(2)?.replace(",", "")?.replace("\\s+".toRegex(), "")
                        val price = priceStr?.toDoubleOrNull()
                        if (name.isNotBlank()) {
                            completedWorks.add(ParsedWork(name, price))
                        }
                    }
                }
                "used_parts" -> {
                    val matcher = partPattern.matcher(line)
                    if (matcher.matches()) {
                        val name = matcher.group(1)?.trim() ?: ""
                        val quantity = matcher.group(2)?.toIntOrNull() ?: 1
                        val unit = matcher.group(3)?.trim() ?: "шт"
                        val priceStr = matcher.group(4)?.replace(",", "")?.replace("\\s+".toRegex(), "")
                        val totalPrice = priceStr?.toDoubleOrNull()
                        if (name.isNotBlank()) {
                            usedParts.add(ParsedPart(name, quantity, unit, totalPrice))
                        }
                    }
                }
                "estimated_works" -> {
                    val matcher = workPattern.matcher(line)
                    if (matcher.matches()) {
                        val name = matcher.group(1)?.trim() ?: ""
                        val priceStr = matcher.group(2)?.replace(",", "")?.replace("\\s+".toRegex(), "")
                        val price = priceStr?.toDoubleOrNull()
                        if (name.isNotBlank()) {
                            estimatedWorks.add(ParsedWork(name, price))
                        }
                    }
                }
                "estimated_parts" -> {
                    val matcher = partPattern.matcher(line)
                    if (matcher.matches()) {
                        val name = matcher.group(1)?.trim() ?: ""
                        val quantity = matcher.group(2)?.toIntOrNull() ?: 1
                        val unit = matcher.group(3)?.trim() ?: "шт"
                        val priceStr = matcher.group(4)?.replace(",", "")?.replace("\\s+".toRegex(), "")
                        val totalPrice = priceStr?.toDoubleOrNull()
                        if (name.isNotBlank()) {
                            estimatedParts.add(ParsedPart(name, quantity, unit, totalPrice))
                        }
                    }
                }
            }
        }
        
        // Извлекаем дополнительные комментарии
        if (additionalStartIndex >= 0 && additionalStartIndex < lines.size) {
            additionalComments = lines.subList(additionalStartIndex, lines.size)
                .joinToString("\n")
                .trim()
                .takeIf { it.isNotBlank() }
        }
        
        // Если не нашли структурированные данные, но есть описание, сохраняем его как originalDescription
        val hasStructuredData = completedWorks.isNotEmpty() || usedParts.isNotEmpty() || 
                                estimatedWorks.isNotEmpty() || estimatedParts.isNotEmpty()
        val originalDescription = if (!hasStructuredData && description.isNotBlank()) {
            description
        } else null
        
        return ParsedRepairDescription(
            completedWorks = completedWorks,
            usedParts = usedParts,
            additionalComments = additionalComments,
            estimatedWorks = estimatedWorks,
            estimatedParts = estimatedParts,
            originalDescription = originalDescription
        )
    }
}
