package com.lovefinder.app.ui

import java.time.Instant

/** Relative time in French, mirrors the web app: "à l'instant", "il y a X min/h/j". */
fun formatRelativeTime(value: String?): String {
    if (value.isNullOrBlank()) return "à l'instant"
    val low = value.trim().lowercase()
    if (low == "now" || low == "à l'instant") return "à l'instant"
    Regex("""^(\d+)\s*(m|min|h|d)$""").matchEntire(low)?.let {
        val n = it.groupValues[1].toInt()
        return when (it.groupValues[2]) {
            "h" -> "il y a $n h"
            "d" -> "il y a $n j"
            else -> if (n < 60) "il y a $n min" else "il y a ${n / 60} h"
        }
    }
    val date = try {
        Instant.parse(value.trim())
    } catch (_: Exception) {
        return value
    }
    val mins = (Instant.now().toEpochMilli() - date.toEpochMilli()) / 60000
    if (mins < 1) return "à l'instant"
    if (mins < 60) return "il y a $mins min"
    val hours = mins / 60
    if (hours < 24) return "il y a $hours h"
    val days = hours / 24
    if (days < 7) return "il y a $days j"
    return value.substring(0, 10)
}
