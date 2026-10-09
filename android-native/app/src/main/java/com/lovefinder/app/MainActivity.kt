package com.lovefinder.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.lovefinder.app.data.Session
import com.lovefinder.app.ui.BottomBar
import com.lovefinder.app.ui.screens.BrowseScreen
import com.lovefinder.app.ui.screens.ChatScreen
import com.lovefinder.app.ui.screens.ForgotScreen
import com.lovefinder.app.ui.screens.LoginScreen
import com.lovefinder.app.ui.screens.MatchesScreen
import com.lovefinder.app.ui.screens.ProfileScreen
import com.lovefinder.app.ui.screens.RegisterScreen
import com.lovefinder.app.ui.screens.SettingsScreen
import com.lovefinder.app.ui.screens.VerifyScreen
import com.lovefinder.app.ui.theme.LoveFinderTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { LoveFinderTheme { App() } }
    }
}

@Composable
fun App() {
    val context = LocalContext.current
    val session = Session(context)
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: "login"
    val start = if (session.isLoggedIn()) "browse" else "login"
    val inApp = route in listOf("browse", "matches", "profile", "settings") ||
        route.startsWith("chat")

    Scaffold(
        bottomBar = {
            if (inApp) {
                BottomBar(current = route) {
                    nav.navigate(it) {
                        popUpTo("browse")
                        launchSingleTop = true
                    }
                }
            }
        }
    ) { pad ->
        NavHost(nav, startDestination = start, modifier = Modifier.padding(pad)) {
            composable("login") {
                LoginScreen(
                    onLoggedIn = {
                        nav.navigate("browse") { popUpTo("login") { inclusive = true } }
                    },
                    onGoRegister = { nav.navigate("register") }
                )
            }
            composable("register") {
                RegisterScreen(onRegistered = { email ->
                    nav.navigate("verify?email=$email")
                })
            }
            composable(
                "verify?email={email}",
                arguments = listOf(navArgument("email") { defaultValue = "" })
            ) { back ->
                VerifyScreen(
                    email = back.arguments?.getString("email") ?: "",
                    onVerified = {
                        nav.navigate("browse") { popUpTo("login") { inclusive = true } }
                    }
                )
            }
            composable("forgot") { ForgotScreen() }
            composable("browse") { BrowseScreen(nav) }
            composable("matches") { MatchesScreen(nav) }
            composable(
                "chat/{id}?name={name}",
                arguments = listOf(
                    navArgument("id") { type = NavType.LongType },
                    navArgument("name") { defaultValue = "" }
                )
            ) { back ->
                ChatScreen(
                    nav = nav,
                    userId = back.arguments?.getLong("id") ?: 0,
                    name = back.arguments?.getString("name") ?: ""
                )
            }
            composable("profile") { ProfileScreen(nav) }
            composable("settings") { SettingsScreen(nav) }
        }
    }
}
