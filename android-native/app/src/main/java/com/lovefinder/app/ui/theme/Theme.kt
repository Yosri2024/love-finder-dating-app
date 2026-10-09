package com.lovefinder.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.isSystemInDarkTheme

val LovePrimary = Color(0xFFFF4458)
val LovePrimaryDark = Color(0xFFE33449)
val LovePrimaryLight = Color(0xFFFF6B7A)

private val LightColors = lightColorScheme(
    primary = LovePrimary,
    onPrimary = Color.White,
    secondary = LovePrimaryDark,
    background = Color(0xFFFAFAFA),
    surface = Color.White
)

private val DarkColors = darkColorScheme(
    primary = LovePrimaryLight,
    onPrimary = Color.Black,
    secondary = LovePrimary,
    background = Color.Black,
    surface = Color(0xFF121212)
)

@Composable
fun LoveFinderTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content
    )
}
