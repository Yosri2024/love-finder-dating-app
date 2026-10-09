package com.lovefinder.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class NavTab(val route: String, val label: String, val icon: ImageVector)

val TABS = listOf(
    NavTab("browse", "Discover", Icons.Filled.Explore),
    NavTab("matches", "Messages", Icons.Filled.ChatBubble),
    NavTab("profile", "Profile", Icons.Filled.Person)
)

@Composable
fun BottomBar(current: String, onGo: (String) -> Unit) {
    NavigationBar {
        TABS.forEach { tab ->
            NavigationBarItem(
                selected = current == tab.route,
                onClick = { onGo(tab.route) },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) }
            )
        }
    }
}

@Composable
fun Avatar(name: String?, size: Int = 52, online: Boolean = false) {
    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primary),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = (name?.firstOrNull()?.uppercase() ?: "?"),
            color = MaterialTheme.colorScheme.onPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = (size / 2).sp
        )
    }
}

/**
 * Swipe tabs: drag left -> next, drag right -> previous.
 * Threshold in px (e.g. with(LocalDensity.current) { 100.dp.toPx() }).
 * Mostly-horizontal drags only, so vertical scroll keeps working.
 */
fun Modifier.swipeTabs(
    thresholdPx: Float,
    onLeft: (() -> Unit)? = null,
    onRight: (() -> Unit)? = null
): Modifier = pointerInput(onLeft, onRight, thresholdPx) {
    var totalX = 0f
    var totalY = 0f
    detectHorizontalDragGestures(
        onDragStart = { totalX = 0f; totalY = 0f },
        onHorizontalDrag = { change, dragAmount ->
            totalX += dragAmount
            totalY += kotlin.math.abs(change.position.y - change.previousPosition.y)
            change.consume()
        },
        onDragEnd = {
            if (kotlin.math.abs(totalX) >= thresholdPx && kotlin.math.abs(totalX) > totalY * 1.5f) {
                if (totalX < 0) onLeft?.invoke() else onRight?.invoke()
            }
        }
    )
}
