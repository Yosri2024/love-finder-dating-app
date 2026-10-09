package com.lovefinder.app.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.UserDto
import com.lovefinder.app.data.retrofitMessage
import com.lovefinder.app.ui.Avatar
import com.lovefinder.app.ui.swipeTabs
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun BrowseScreen(nav: NavController) {
    val context = LocalContext.current
    val activity = context as? android.app.Activity
    val threshold = with(LocalDensity.current) { 100.dp.toPx() }
    val api = remember { ApiClient.get(context) }
    val scope = rememberCoroutineScope()

    var users by remember { mutableStateOf<List<UserDto>>(emptyList()) }
    var index by remember { mutableStateOf(0) }
    var loading by remember { mutableStateOf(true) }
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<UserDto>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var searchJob by remember { mutableStateOf<Job?>(null) }

    LaunchedEffect(Unit) {
        try {
            users = api.recommendations()
        } catch (e: Exception) {
            message = retrofitMessage(e)
        } finally {
            loading = false
        }
    }

    LaunchedEffect(query) {
        val q = query.trim()
        if (q.isEmpty()) {
            results = emptyList()
            searching = false
            return@LaunchedEffect
        }
        searching = true
        searchJob?.cancel()
        searchJob = launch {
            delay(300)
            results = try {
                api.searchUsers(q)
            } catch (_: Exception) {
                emptyList()
            }
            searching = false
        }
    }

    fun act(like: Boolean, u: UserDto) {
        scope.launch {
            try {
                val res = if (like) api.like(u.id) else api.pass(u.id)
                message = if (res.matched == true) "💕 It's a match with ${u.name}!" else ""
                if (query.trim().isEmpty()) {
                    if (index < users.size - 1) index++ else {
                        users = try {
                            api.recommendations()
                        } catch (_: Exception) {
                            emptyList()
                        }
                        index = 0
                    }
                } else {
                    results = results.filter { it.id != u.id }
                }
            } catch (e: Exception) {
                message = retrofitMessage(e)
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(16.dp)
            .swipeTabs(
                thresholdPx = threshold,
                onRight = { activity?.moveTaskToBack(true) }
            )
    ) {
        Text("💕 Discover", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("Search by name...") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        if (message.isNotEmpty()) Text(message, color = MaterialTheme.colorScheme.primary)

        when {
            loading || searching -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            query.trim().isNotEmpty() -> {
                if (results.isEmpty()) {
                    Text("Nothing for \"$query\".")
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(results, key = { it.id }) { u ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Avatar(u.name)
                                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                    Text("${u.name ?: "?"} ${u.age ?: ""}", fontWeight = FontWeight.Bold)
                                    if (!u.bio.isNullOrEmpty()) Text(u.bio!!, fontSize = 13.sp)
                                }
                                IconButton(onClick = { act(false, u) }) {
                                    Icon(Icons.Filled.Close, "Pass", tint = Color.Gray)
                                }
                                IconButton(onClick = { act(true, u) }) {
                                    Icon(Icons.Filled.Favorite, "Like", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
            users.isEmpty() -> {
                Text("No more profiles — check back later!")
            }
            else -> {
                val u = users.getOrNull(index)
                if (u == null) {
                    Text("No more profiles — check back later!")
                } else {
                    // Swipe card: drag left = Pass, drag right = Like (Tinder-style)
                    val density = LocalDensity.current
                    val flingThreshold = with(density) { 90.dp.toPx() }
                    val offScreen = with(density) { 700.dp.toPx() }
                    val offsetX = remember(u.id) { Animatable(0f) }
                    val stampAlpha = (kotlin.math.abs(offsetX.value) / flingThreshold).coerceIn(0f, 1f)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .graphicsLayer {
                                translationX = offsetX.value
                                rotationZ = (offsetX.value / 40f).coerceIn(-8f, 8f)
                            }
                            .pointerInput(u.id) {
                                detectHorizontalDragGestures(
                                    onDragCancel = {
                                        scope.launch { offsetX.animateTo(0f, tween(200)) }
                                    },
                                    onDragEnd = {
                                        val v = offsetX.value
                                        scope.launch {
                                            when {
                                                v <= -flingThreshold -> {
                                                    offsetX.animateTo(-offScreen, tween(150))
                                                    act(false, u)
                                                }
                                                v >= flingThreshold -> {
                                                    offsetX.animateTo(offScreen, tween(150))
                                                    act(true, u)
                                                }
                                                else -> offsetX.animateTo(0f, tween(200))
                                            }
                                        }
                                    },
                                    onHorizontalDrag = { change, dragAmount ->
                                        scope.launch { offsetX.snapTo(offsetX.value + dragAmount) }
                                        change.consume()
                                    }
                                )
                            },
                        shape = RoundedCornerShape(24.dp),
                        elevation = CardDefaults.cardElevation(8.dp)
                    ) {
                        Column(Modifier.fillMaxSize()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f)
                                    .background(
                                        Brush.linearGradient(
                                            listOf(
                                                MaterialTheme.colorScheme.primary,
                                                MaterialTheme.colorScheme.secondary
                                            )
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (offsetX.value < 0) {
                                    Text(
                                        "PASS",
                                        fontSize = 28.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White.copy(alpha = stampAlpha),
                                        modifier = Modifier
                                            .align(Alignment.TopStart)
                                            .padding(20.dp)
                                            .background(
                                                Color.White.copy(alpha = 0.15f * stampAlpha),
                                                RoundedCornerShape(8.dp)
                                            )
                                            .padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                                if (offsetX.value > 0) {
                                    Text(
                                        "LIKE",
                                        fontSize = 28.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White.copy(alpha = stampAlpha),
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .padding(20.dp)
                                            .background(
                                                Color.White.copy(alpha = 0.15f * stampAlpha),
                                                RoundedCornerShape(8.dp)
                                            )
                                            .padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                                Text(
                                    (u.name?.firstOrNull()?.uppercase() ?: "?"),
                                    fontSize = 120.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                            Column(Modifier.padding(16.dp)) {
                                Text(
                                    "${u.name ?: "?"}  ${u.age ?: ""}",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                if (!u.bio.isNullOrEmpty()) Text(u.bio!!)
                            }
                            Row(
                                Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                OutlinedButton(onClick = { act(false, u) }) {
                                    Icon(Icons.Filled.Close, "Pass")
                                    Text(" Pass")
                                }
                                Button(
                                    onClick = { act(true, u) },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.primary
                                    )
                                ) {
                                    Icon(Icons.Filled.Favorite, "Like")
                                    Text(" Like")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
