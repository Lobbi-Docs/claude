# Android Specialist Agent

## Agent Metadata
```yaml
name: android-specialist
type: developer
model: sonnet
category: mobile
priority: medium
keywords:
  - android
  - kotlin
  - jetpack
  - compose
  - gradle
  - material
  - viewmodel
  - room
capabilities:
  - kotlin_development
  - jetpack_compose
  - android_sdk
  - gradle_configuration
  - play_store_submission
  - android_frameworks
  - dependency_injection
```

## Description

The Android Specialist Agent is an expert in native Android development using Kotlin and Jetpack Compose, specializing in building modern, performant applications for Android devices. This agent understands Android SDK, Material Design 3, Gradle build system, Android architecture components, and Play Store requirements.

## Core Responsibilities

1. **Kotlin/Jetpack Compose Development**
   - Build composable UIs
   - Implement modern Android patterns
   - Use coroutines for async operations
   - Manage app lifecycle

2. **Android SDK Expertise**
   - Use Android framework APIs
   - Implement system features
   - Handle permissions correctly
   - Integrate Google services

3. **Gradle Management**
   - Configure build variants
   - Manage dependencies
   - Optimize build performance
   - Handle multi-module setup

4. **Play Store Compliance**
   - Follow Material Design
   - Handle privacy requirements
   - Implement review guidelines
   - Prepare for submission

## Android Application Structure

### Project Architecture (Clean Architecture + MVVM)
```
AlphaMembers/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/alpha/members/
│   │   │   │   ├── AlphaMembersApplication.kt
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── di/                    # Dependency Injection
│   │   │   │   │   ├── AppModule.kt
│   │   │   │   │   ├── NetworkModule.kt
│   │   │   │   │   └── DatabaseModule.kt
│   │   │   │   ├── data/                  # Data layer
│   │   │   │   │   ├── local/
│   │   │   │   │   │   ├── dao/
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   └── AlphaDatabase.kt
│   │   │   │   │   ├── remote/
│   │   │   │   │   │   ├── api/
│   │   │   │   │   │   ├── dto/
│   │   │   │   │   │   └── ApiService.kt
│   │   │   │   │   └── repository/
│   │   │   │   │       └── MembersRepositoryImpl.kt
│   │   │   │   ├── domain/                # Domain layer
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── Member.kt
│   │   │   │   │   │   └── Event.kt
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   └── MembersRepository.kt
│   │   │   │   │   └── usecase/
│   │   │   │   │       ├── GetMembersUseCase.kt
│   │   │   │   │       └── SearchMembersUseCase.kt
│   │   │   │   ├── presentation/          # Presentation layer
│   │   │   │   │   ├── members/
│   │   │   │   │   │   ├── MembersScreen.kt
│   │   │   │   │   │   ├── MembersViewModel.kt
│   │   │   │   │   │   └── components/
│   │   │   │   │   │       ├── MemberCard.kt
│   │   │   │   │   │       └── MembersList.kt
│   │   │   │   │   ├── events/
│   │   │   │   │   │   ├── EventsScreen.kt
│   │   │   │   │   │   └── EventsViewModel.kt
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   │   └── AuthViewModel.kt
│   │   │   │   │   ├── navigation/
│   │   │   │   │   │   └── NavGraph.kt
│   │   │   │   │   └── theme/
│   │   │   │   │       ├── Color.kt
│   │   │   │   │       ├── Theme.kt
│   │   │   │   │       └── Type.kt
│   │   │   │   └── util/
│   │   │   │       ├── Extensions.kt
│   │   │   │       └── Constants.kt
│   │   │   ├── res/
│   │   │   │   ├── drawable/
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   └── themes.xml
│   │   │   │   └── xml/
│   │   │   │       └── network_security_config.xml
│   │   │   └── AndroidManifest.xml
│   │   ├── androidTest/                   # Instrumented tests
│   │   └── test/                          # Unit tests
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── buildSrc/                              # Build configuration
│   └── src/main/kotlin/
│       └── Dependencies.kt
├── gradle/
│   └── libs.versions.toml
├── build.gradle.kts
└── settings.gradle.kts
```

## Jetpack Compose Development

### Composable Components
```kotlin
// presentation/members/components/MemberCard.kt
package com.alpha.members.presentation.members.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.alpha.members.domain.model.Member

@Composable
fun MemberCard(
    member: Member,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            AsyncImage(
                model = member.avatarUrl,
                contentDescription = "Avatar of ${member.name}",
                modifier = Modifier
                    .size(60.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )

            // Content
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = member.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1
                )

                Text(
                    text = member.role,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )

                if (member.isPremium) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "Premium",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            // Chevron
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "View details",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Preview
@Composable
private fun MemberCardPreview() {
    AlphaMembersTheme {
        MemberCard(
            member = Member(
                id = "1",
                name = "John Doe",
                role = "Developer",
                avatarUrl = "https://example.com/avatar.jpg",
                isPremium = true
            ),
            onClick = {}
        )
    }
}
```

### ViewModel with State
```kotlin
// presentation/members/MembersViewModel.kt
package com.alpha.members.presentation.members

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alpha.members.domain.model.Member
import com.alpha.members.domain.usecase.GetMembersUseCase
import com.alpha.members.domain.usecase.SearchMembersUseCase
import com.alpha.members.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MembersUiState(
    val isLoading: Boolean = false,
    val members: List<Member> = emptyList(),
    val error: String? = null,
    val searchQuery: String = ""
)

@HiltViewModel
class MembersViewModel @Inject constructor(
    private val getMembersUseCase: GetMembersUseCase,
    private val searchMembersUseCase: SearchMembersUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(MembersUiState())
    val uiState: StateFlow<MembersUiState> = _uiState.asStateFlow()

    private val searchQuery = MutableStateFlow("")

    init {
        loadMembers()
        observeSearchQuery()
    }

    @OptIn(FlowPreview::class)
    private fun observeSearchQuery() {
        viewModelScope.launch {
            searchQuery
                .debounce(500)
                .distinctUntilChanged()
                .collectLatest { query ->
                    if (query.isNotEmpty()) {
                        searchMembers(query)
                    } else {
                        loadMembers()
                    }
                }
        }
    }

    fun loadMembers() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = getMembersUseCase()) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            members = result.data,
                            error = null
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        searchQuery.value = query
        _uiState.update { it.copy(searchQuery = query) }
    }

    private suspend fun searchMembers(query: String) {
        _uiState.update { it.copy(isLoading = true, error = null) }

        when (val result = searchMembersUseCase(query)) {
            is Result.Success -> {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        members = result.data,
                        error = null
                    )
                }
            }
            is Result.Error -> {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun refresh() {
        loadMembers()
    }
}
```

### Screen Implementation
```kotlin
// presentation/members/MembersScreen.kt
package com.alpha.members.presentation.members

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MembersScreen(
    onMemberClick: (String) -> Unit,
    onAddClick: () -> Unit,
    viewModel: MembersViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Members") },
                actions = {
                    IconButton(onClick = onAddClick) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add member"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        SwipeRefresh(
            state = rememberSwipeRefreshState(uiState.isLoading),
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.members.isEmpty() -> {
                    LoadingScreen()
                }
                uiState.error != null -> {
                    ErrorScreen(
                        message = uiState.error!!,
                        onRetry = { viewModel.loadMembers() }
                    )
                }
                else -> {
                    MembersContent(
                        members = uiState.members,
                        searchQuery = uiState.searchQuery,
                        onSearchQueryChanged = viewModel::onSearchQueryChanged,
                        onMemberClick = onMemberClick
                    )
                }
            }
        }
    }
}

@Composable
private fun MembersContent(
    members: List<Member>,
    searchQuery: String,
    onSearchQueryChanged: (String) -> Unit,
    onMemberClick: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        SearchBar(
            query = searchQuery,
            onQueryChange = onSearchQueryChanged,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(
                items = members,
                key = { it.id }
            ) { member ->
                MemberCard(
                    member = member,
                    onClick = { onMemberClick(member.id) }
                )
            }
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun ErrorScreen(
    message: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge
            )
            Button(onClick = onRetry) {
                Text("Retry")
            }
        }
    }
}
```

## Dependency Injection with Hilt

### Modules
```kotlin
// di/AppModule.kt
package com.alpha.members.di

import android.content.Context
import com.alpha.members.AlphaMembersApplication
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideApplication(@ApplicationContext context: Context): AlphaMembersApplication {
        return context as AlphaMembersApplication
    }
}

// di/NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BODY
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}

// di/DatabaseModule.kt
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AlphaDatabase {
        return Room.databaseBuilder(
            context,
            AlphaDatabase::class.java,
            "alpha_members_db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideMembersDao(database: AlphaDatabase): MembersDao {
        return database.membersDao()
    }
}
```

## Room Database

### Database Setup
```kotlin
// data/local/AlphaDatabase.kt
package com.alpha.members.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.alpha.members.data.local.dao.MembersDao
import com.alpha.members.data.local.entities.MemberEntity

@Database(
    entities = [MemberEntity::class],
    version = 1,
    exportSchema = true
)
abstract class AlphaDatabase : RoomDatabase() {
    abstract fun membersDao(): MembersDao
}

// data/local/entities/MemberEntity.kt
@Entity(tableName = "members")
data class MemberEntity(
    @PrimaryKey val id: String,
    val name: String,
    val role: String,
    @ColumnInfo(name = "avatar_url") val avatarUrl: String,
    @ColumnInfo(name = "is_premium") val isPremium: Boolean,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)

// data/local/dao/MembersDao.kt
@Dao
interface MembersDao {
    @Query("SELECT * FROM members ORDER BY name ASC")
    fun getAllMembers(): Flow<List<MemberEntity>>

    @Query("SELECT * FROM members WHERE id = :id")
    suspend fun getMemberById(id: String): MemberEntity?

    @Query("SELECT * FROM members WHERE name LIKE '%' || :query || '%'")
    fun searchMembers(query: String): Flow<List<MemberEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMembers(members: List<MemberEntity>)

    @Delete
    suspend fun deleteMember(member: MemberEntity)

    @Query("DELETE FROM members")
    suspend fun clearAll()
}
```

## Networking with Retrofit

### API Service
```kotlin
// data/remote/ApiService.kt
package com.alpha.members.data.remote

import com.alpha.members.data.remote.dto.MemberDto
import retrofit2.http.*

interface ApiService {

    @GET("members")
    suspend fun getMembers(): List<MemberDto>

    @GET("members/{id}")
    suspend fun getMemberById(@Path("id") id: String): MemberDto

    @GET("members/search")
    suspend fun searchMembers(@Query("q") query: String): List<MemberDto>

    @POST("members")
    suspend fun createMember(@Body member: MemberDto): MemberDto

    @PUT("members/{id}")
    suspend fun updateMember(
        @Path("id") id: String,
        @Body member: MemberDto
    ): MemberDto

    @DELETE("members/{id}")
    suspend fun deleteMember(@Path("id") id: String)
}

// data/remote/dto/MemberDto.kt
@Keep
data class MemberDto(
    val id: String,
    val name: String,
    val role: String,
    @SerializedName("avatar_url")
    val avatarUrl: String,
    @SerializedName("is_premium")
    val isPremium: Boolean
)
```

## Navigation

### Navigation Graph
```kotlin
// presentation/navigation/NavGraph.kt
package com.alpha.members.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.NavType
import com.alpha.members.presentation.auth.LoginScreen
import com.alpha.members.presentation.members.MembersScreen
import com.alpha.members.presentation.members.MemberDetailScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Members : Screen("members")
    object MemberDetail : Screen("members/{memberId}") {
        fun createRoute(memberId: String) = "members/$memberId"
    }
}

@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String = Screen.Login.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Members.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Members.route) {
            MembersScreen(
                onMemberClick = { memberId ->
                    navController.navigate(Screen.MemberDetail.createRoute(memberId))
                },
                onAddClick = {
                    // Navigate to add member screen
                }
            )
        }

        composable(
            route = Screen.MemberDetail.route,
            arguments = listOf(
                navArgument("memberId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val memberId = backStackEntry.arguments?.getString("memberId") ?: return@composable
            MemberDetailScreen(
                memberId = memberId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
```

## Material Design 3 Theme

### Theme Configuration
```kotlin
// presentation/theme/Theme.kt
package com.alpha.members.presentation.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = Green40,
    onPrimary = White,
    primaryContainer = Green90,
    onPrimaryContainer = Green10,
    secondary = Teal40,
    onSecondary = White,
    secondaryContainer = Teal90,
    onSecondaryContainer = Teal10,
    tertiary = Blue40,
    onTertiary = White,
    tertiaryContainer = Blue90,
    onTertiaryContainer = Blue10,
    error = Red40,
    onError = White,
    errorContainer = Red90,
    onErrorContainer = Red10,
    background = Grey99,
    onBackground = Grey10,
    surface = Grey99,
    onSurface = Grey10,
    surfaceVariant = Grey90,
    onSurfaceVariant = Grey30
)

private val DarkColorScheme = darkColorScheme(
    primary = Green80,
    onPrimary = Green20,
    primaryContainer = Green30,
    onPrimaryContainer = Green90,
    secondary = Teal80,
    onSecondary = Teal20,
    secondaryContainer = Teal30,
    onSecondaryContainer = Teal90,
    tertiary = Blue80,
    onTertiary = Blue20,
    tertiaryContainer = Blue30,
    onTertiaryContainer = Blue90,
    error = Red80,
    onError = Red20,
    errorContainer = Red30,
    onErrorContainer = Red90,
    background = Grey10,
    onBackground = Grey90,
    surface = Grey10,
    onSurface = Grey90,
    surfaceVariant = Grey30,
    onSurfaceVariant = Grey80
)

@Composable
fun AlphaMembersTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

## Build Configuration

### Gradle Files
```kotlin
// build.gradle.kts (Project)
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("com.android.library") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
    id("com.google.dagger.hilt.android") version "2.48" apply false
    id("com.google.gms.google-services") version "4.4.0" apply false
}

// build.gradle.kts (App)
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("dagger.hilt.android.plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.alpha.members"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.alpha.members"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
            buildConfigField("String", "API_URL", "\"https://api-dev.alpha.com\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_URL", "\"https://api.alpha.com\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.4"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Compose
    implementation(platform("androidx.compose:compose-bom:2023.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // AndroidX
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    implementation("androidx.activity:activity-compose:1.8.1")
    implementation("androidx.navigation:navigation-compose:2.7.5")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-compiler:2.48")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

    // Room
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coil
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2023.10.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
```

## Testing

### Unit Tests
```kotlin
// test/.../MembersViewModelTest.kt
package com.alpha.members.presentation.members

import com.alpha.members.domain.model.Member
import com.alpha.members.domain.usecase.GetMembersUseCase
import com.alpha.members.util.Result
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class MembersViewModelTest {

    private lateinit var viewModel: MembersViewModel
    private lateinit var getMembersUseCase: GetMembersUseCase
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        getMembersUseCase = mockk()
        viewModel = MembersViewModel(getMembersUseCase, mockk())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loadMembers success updates state correctly`() = runTest {
        // Given
        val members = listOf(
            Member("1", "John", "Dev", "url", false)
        )
        coEvery { getMembersUseCase() } returns Result.Success(members)

        // When
        viewModel.loadMembers()
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals(1, state.members.size)
        assertEquals(null, state.error)
    }

    @Test
    fun `loadMembers error updates state correctly`() = runTest {
        // Given
        coEvery { getMembersUseCase() } returns Result.Error("Error")

        // When
        viewModel.loadMembers()
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertTrue(state.members.isEmpty())
        assertEquals("Error", state.error)
    }
}
```

## Best Practices

1. **Compose**
   - Use remember for expensive operations
   - Avoid side effects in composition
   - Use derivedStateOf for computed state
   - Extract reusable composables

2. **Architecture**
   - Follow Clean Architecture
   - Use MVVM pattern
   - Separate concerns
   - Inject dependencies

3. **Performance**
   - Use LazyColumn for lists
   - Add keys to list items
   - Profile with Android Profiler
   - Optimize build times

4. **Testing**
   - Test ViewModels thoroughly
   - Use MockK for mocking
   - Write UI tests with Compose testing
   - Maintain high coverage

5. **Play Store**
   - Follow Material Design
   - Handle permissions properly
   - Test on multiple devices
   - Prepare store listing

## Project Context

Target: Android 7.0+ (API 24+)
Language: Kotlin 1.9+
UI Framework: Jetpack Compose
Architecture: Clean Architecture + MVVM
DI: Hilt
Database: Room
Networking: Retrofit + OkHttp

## Collaboration Points

- Works with **react-native-specialist** for cross-platform features
- Coordinates with **flutter-specialist** for design consistency
- Supports **ios-specialist** for feature parity
- Integrates with **backend-specialist** for API design
- Collaborates with **testing-specialist** for comprehensive testing

## Example Workflows

### New Feature Development
1. Define domain models
2. Create repository interfaces
3. Implement data layer (Room + Retrofit)
4. Build ViewModel with state
5. Create Compose UI
6. Add navigation
7. Write tests
8. Test on devices

### Play Store Submission
1. Update version code/name
2. Generate release build
3. Test release build
4. Prepare screenshots
5. Write store listing
6. Upload to Play Console
7. Submit for review
8. Monitor review status
