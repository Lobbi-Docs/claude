/**
 * Lobbi Archetype Gradle Plugin
 *
 * Unified archetype lifecycle management with Structurizr and Harness integration.
 *
 * Usage:
 *   plugins {
 *       id("io.lobbi.archetype") version "1.0.0"
 *   }
 *
 * Tasks:
 *   - analyzeProject: Analyze source project for template conversion
 *   - createArchetype: Create archetype from source project
 *   - scaffoldProject: Create new project from archetype
 *   - validateArchetype: Validate archetype structure and variables
 *   - registerArchitecture: Register project in Structurizr workspace
 *   - exportDiagrams: Export Structurizr diagrams to multiple formats
 *   - publishHarnessTemplates: Publish Harness step/stage/pipeline templates
 *   - archetypeFullFlow: Complete workflow from analysis to publishing
 */

import org.gradle.api.DefaultTask
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.MapProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.*
import org.gradle.kotlin.dsl.*
import java.io.File

// ============================================================================
// EXTENSION CONFIGURATION
// ============================================================================

interface ArchetypeExtension {
    // Source project to convert
    val sourceProject: DirectoryProperty

    // Output archetype location
    val archetypeOutput: DirectoryProperty

    // Template formats to generate
    val formats: ListProperty<String>

    // Structurizr configuration
    val structurizr: StructurizrConfig

    // Harness configuration
    val harness: HarnessConfig

    // Variable overrides
    val variables: MapProperty<String, VariableConfig>
}

interface StructurizrConfig {
    val enabled: Property<Boolean>
    val workspacePath: RegularFileProperty
    val fragmentsPath: DirectoryProperty
    val autoRegister: Property<Boolean>
    val exportFormats: ListProperty<String>
    val githubPagesRepo: Property<String>
}

interface HarnessConfig {
    val enabled: Property<Boolean>
    val org: Property<String>
    val project: Property<String>
    val publishTemplates: Property<Boolean>
    val templateTypes: ListProperty<String>
    val accountId: Property<String>
}

data class VariableConfig(
    val type: String = "string",
    val validation: String? = null,
    val required: Boolean = true,
    val default: String? = null,
    val prompt: String? = null
)

// ============================================================================
// PLUGIN IMPLEMENTATION
// ============================================================================

class ArchetypePlugin : Plugin<Project> {
    override fun apply(project: Project) {
        // Create extension
        val extension = project.extensions.create<ArchetypeExtension>("archetype")

        // Set defaults
        extension.formats.convention(listOf("copier", "harness"))
        extension.structurizr.enabled.convention(true)
        extension.structurizr.exportFormats.convention(listOf("mermaid", "plantuml"))
        extension.structurizr.autoRegister.convention(true)
        extension.harness.enabled.convention(true)
        extension.harness.publishTemplates.convention(true)
        extension.harness.templateTypes.convention(listOf("step", "stage", "pipeline"))

        // Register tasks
        project.tasks.apply {
            register<AnalyzeProjectTask>("analyzeProject") {
                group = "archetype"
                description = "Analyze source project for template conversion opportunities"
                sourceProject.set(extension.sourceProject)
            }

            register<CreateArchetypeTask>("createArchetype") {
                group = "archetype"
                description = "Create archetype from source project"
                dependsOn("analyzeProject")
                sourceProject.set(extension.sourceProject)
                outputDir.set(extension.archetypeOutput)
                formats.set(extension.formats)
                structurizrEnabled.set(extension.structurizr.enabled)
                harnessEnabled.set(extension.harness.enabled)
            }

            register<ValidateArchetypeTask>("validateArchetype") {
                group = "archetype"
                description = "Validate archetype structure and variables"
                archetypeDir.set(extension.archetypeOutput)
            }

            register<ScaffoldProjectTask>("scaffoldProject") {
                group = "archetype"
                description = "Create new project from archetype"
                archetypeDir.set(extension.archetypeOutput)
                projectName.set(project.findProperty("projectName")?.toString() ?: "new-project")
                outputDir.set(project.layout.projectDirectory.dir("generated"))
                registerArchitecture.set(extension.structurizr.autoRegister)
            }

            register<RegisterArchitectureTask>("registerArchitecture") {
                group = "architecture"
                description = "Register project in Structurizr workspace"
                workspacePath.set(extension.structurizr.workspacePath)
                fragmentsPath.set(extension.structurizr.fragmentsPath)
                projectName.set(project.findProperty("projectName")?.toString())
            }

            register<ExportDiagramsTask>("exportDiagrams") {
                group = "architecture"
                description = "Export Structurizr diagrams to multiple formats"
                workspacePath.set(extension.structurizr.workspacePath)
                formats.set(extension.structurizr.exportFormats)
                outputDir.set(project.layout.projectDirectory.dir("docs/diagrams"))
            }

            register<PublishHarnessTemplatesTask>("publishHarnessTemplates") {
                group = "harness"
                description = "Publish Harness step/stage/pipeline templates"
                archetypeDir.set(extension.archetypeOutput)
                harnessOrg.set(extension.harness.org)
                harnessProject.set(extension.harness.project)
                templateTypes.set(extension.harness.templateTypes)
                publish.set(extension.harness.publishTemplates)
            }

            register<PushGitHubPagesTask>("pushGitHubPages") {
                group = "architecture"
                description = "Push diagrams to GitHub Pages"
                diagramsDir.set(project.layout.projectDirectory.dir("docs/diagrams"))
                repoUrl.set(extension.structurizr.githubPagesRepo)
            }

            // Full workflow task
            register("archetypeFullFlow") {
                group = "archetype"
                description = "Complete archetype workflow: analyze → create → validate → test → register → export → publish"
                dependsOn(
                    "analyzeProject",
                    "createArchetype",
                    "validateArchetype",
                    "scaffoldProject",
                    "registerArchitecture",
                    "exportDiagrams",
                    "publishHarnessTemplates",
                    "pushGitHubPages"
                )
            }
        }
    }
}

// ============================================================================
// TASK IMPLEMENTATIONS
// ============================================================================

abstract class AnalyzeProjectTask : DefaultTask() {
    @get:InputDirectory
    abstract val sourceProject: DirectoryProperty

    @get:OutputFile
    val analysisReport: RegularFileProperty = project.objects.fileProperty()
        .convention(project.layout.buildDirectory.file("archetype/analysis.yaml"))

    @TaskAction
    fun analyze() {
        val source = sourceProject.get().asFile
        logger.lifecycle("Analyzing project: ${source.absolutePath}")

        // Detect project type
        val projectType = detectProjectType(source)
        logger.lifecycle("  Detected type: $projectType")

        // Find variable candidates
        val variables = findVariableCandidates(source)
        logger.lifecycle("  Found ${variables.size} variable candidates")

        // Extract Structurizr metadata
        val structurizrMeta = extractStructurizrMetadata(source, projectType)

        // Detect Harness template opportunities
        val harnessOpportunities = detectHarnessOpportunities(source)

        // Write analysis report
        val report = buildAnalysisReport(projectType, variables, structurizrMeta, harnessOpportunities)
        analysisReport.get().asFile.apply {
            parentFile.mkdirs()
            writeText(report)
        }

        logger.lifecycle("Analysis complete: ${analysisReport.get().asFile.absolutePath}")
    }

    private fun detectProjectType(source: File): String {
        return when {
            File(source, "pyproject.toml").exists() -> "python-poetry"
            File(source, "requirements.txt").exists() -> "python-pip"
            File(source, "package.json").exists() && File(source, "tsconfig.json").exists() -> "typescript-node"
            File(source, "package.json").exists() -> "javascript-node"
            File(source, "pom.xml").exists() -> "java-maven"
            File(source, "build.gradle.kts").exists() -> "kotlin-gradle"
            File(source, "build.gradle").exists() -> "java-gradle"
            File(source, "go.mod").exists() -> "go"
            File(source, "Cargo.toml").exists() -> "rust"
            else -> "unknown"
        }
    }

    private fun findVariableCandidates(source: File): List<Map<String, Any>> {
        // Implementation: scan files for hardcoded values
        return listOf()
    }

    private fun extractStructurizrMetadata(source: File, projectType: String): Map<String, Any> {
        // Implementation: extract architecture metadata
        return mapOf(
            "type" to "softwareSystem",
            "technology" to projectType
        )
    }

    private fun detectHarnessOpportunities(source: File): Map<String, Any> {
        // Implementation: detect Harness template opportunities
        return mapOf()
    }

    private fun buildAnalysisReport(
        projectType: String,
        variables: List<Map<String, Any>>,
        structurizr: Map<String, Any>,
        harness: Map<String, Any>
    ): String {
        return """
            |project_analysis:
            |  detected_type: $projectType
            |  variable_candidates: ${variables.size}
            |  structurizr_metadata:
            |    type: ${structurizr["type"]}
            |    technology: ${structurizr["technology"]}
            |  harness_opportunities: detected
        """.trimMargin()
    }
}

abstract class CreateArchetypeTask : DefaultTask() {
    @get:InputDirectory
    abstract val sourceProject: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Input
    abstract val formats: ListProperty<String>

    @get:Input
    abstract val structurizrEnabled: Property<Boolean>

    @get:Input
    abstract val harnessEnabled: Property<Boolean>

    @TaskAction
    fun create() {
        val source = sourceProject.get().asFile
        val output = outputDir.get().asFile
        logger.lifecycle("Creating archetype from: ${source.absolutePath}")
        logger.lifecycle("Output: ${output.absolutePath}")

        output.mkdirs()

        // Create template directory
        val templateDir = File(output, "template")
        templateDir.mkdirs()

        // Copy and templatize files
        source.walkTopDown()
            .filter { it.isFile }
            .filter { !it.path.contains(".git") }
            .filter { !it.path.contains("__pycache__") }
            .filter { !it.path.contains("node_modules") }
            .forEach { file ->
                val relativePath = file.relativeTo(source).path
                val targetFile = File(templateDir, templatizePath(relativePath))
                targetFile.parentFile.mkdirs()

                val content = templatizeContent(file.readText())
                targetFile.writeText(content)
            }

        // Generate format-specific config files
        formats.get().forEach { format ->
            when (format) {
                "copier" -> generateCopierConfig(output)
                "cookiecutter" -> generateCookiecutterConfig(output)
                "maven" -> generateMavenArchetypeConfig(output)
                "harness" -> generateHarnessTemplates(output)
            }
        }

        // Generate Structurizr fragment template
        if (structurizrEnabled.get()) {
            generateStructurizrFragment(output)
        }

        logger.lifecycle("Archetype created successfully")
    }

    private fun templatizePath(path: String): String {
        // Replace project name with template variable
        return path.replace("svc-membership", "{{ project_name }}")
    }

    private fun templatizeContent(content: String): String {
        // Replace hardcoded values with template variables
        return content
            .replace("svc-membership", "{{ project_name }}")
            .replace("membership_service", "{{ database_name }}")
            .replace("8000", "{{ service_port }}")
    }

    private fun generateCopierConfig(output: File) {
        File(output, "copier.yml").writeText("""
            |_min_copier_version: "9.0.0"
            |_subdirectory: template
            |
            |project_name:
            |  type: str
            |  help: "Project name (lowercase, hyphenated)"
            |  validator: "{% if not project_name | regex_search('^[a-z][a-z0-9-]*$') %}Invalid{% endif %}"
            |
            |project_description:
            |  type: str
            |  help: "Brief project description"
            |
            |database_name:
            |  type: str
            |  help: "Database name"
            |  default: "{{ project_name | replace('-', '_') }}_db"
            |
            |service_port:
            |  type: int
            |  help: "Service port"
            |  default: 8000
        """.trimMargin())
    }

    private fun generateCookiecutterConfig(output: File) {
        File(output, "cookiecutter.json").writeText("""
            |{
            |  "project_name": "my-service",
            |  "project_slug": "{{ cookiecutter.project_name | lower | replace(' ', '-') }}",
            |  "project_description": "A microservice",
            |  "database_name": "{{ cookiecutter.project_slug | replace('-', '_') }}_db",
            |  "service_port": "8000"
            |}
        """.trimMargin())
    }

    private fun generateMavenArchetypeConfig(output: File) {
        val metaInf = File(output, "META-INF/maven")
        metaInf.mkdirs()
        File(metaInf, "archetype-metadata.xml").writeText("""
            |<?xml version="1.0" encoding="UTF-8"?>
            |<archetype-descriptor name="service-archetype">
            |  <requiredProperties>
            |    <requiredProperty key="groupId"><defaultValue>io.lobbi</defaultValue></requiredProperty>
            |    <requiredProperty key="artifactId"/>
            |    <requiredProperty key="version"><defaultValue>1.0.0-SNAPSHOT</defaultValue></requiredProperty>
            |  </requiredProperties>
            |  <fileSets>
            |    <fileSet filtered="true"><directory>src</directory></fileSet>
            |  </fileSets>
            |</archetype-descriptor>
        """.trimMargin())
    }

    private fun generateHarnessTemplates(output: File) {
        val harnessDir = File(output, "templates/harness")
        harnessDir.mkdirs()

        // Generate step templates
        File(harnessDir, "steps").mkdirs()

        // Generate stage templates
        File(harnessDir, "stages").mkdirs()

        // Generate pipeline templates
        File(harnessDir, "pipelines").mkdirs()

        logger.lifecycle("Generated Harness templates in: ${harnessDir.absolutePath}")
    }

    private fun generateStructurizrFragment(output: File) {
        val fragmentDir = File(output, "structurizr/fragments")
        fragmentDir.mkdirs()
        File(fragmentDir, "service-template.dsl").writeText("""
            |# Generated Structurizr fragment for {{ project_name }}
            |
            |{{ project_name | camelCase }} = softwareSystem "{{ project_name | titleCase }}" "{{ project_description }}" {
            |    tags "Internal" "Backend" "Microservice"
            |
            |    {{ project_name | camelCase }}Api = container "{{ project_name | titleCase }} API" "{{ project_description }}" "{{ technology }}" {
            |        tags "API"
            |    }
            |
            |    {{ project_name | camelCase }}Db = container "{{ project_name | titleCase }} Database" "Data store" "{{ database_type }}" {
            |        tags "Database"
            |    }
            |
            |    {{ project_name | camelCase }}Api -> {{ project_name | camelCase }}Db "Reads/Writes"
            |}
            |
            |# Relationships
            |uiSite -> {{ project_name | camelCase }} "Uses" "REST/HTTPS"
            |gateway -> {{ project_name | camelCase }} "Routes to"
        """.trimMargin())
    }
}

abstract class ValidateArchetypeTask : DefaultTask() {
    @get:InputDirectory
    abstract val archetypeDir: DirectoryProperty

    @TaskAction
    fun validate() {
        val archetype = archetypeDir.get().asFile
        logger.lifecycle("Validating archetype: ${archetype.absolutePath}")

        var valid = true

        // Check template directory exists
        val templateDir = File(archetype, "template")
        if (!templateDir.exists()) {
            logger.error("Missing template/ directory")
            valid = false
        }

        // Check config file exists
        val hasCopier = File(archetype, "copier.yml").exists()
        val hasCookiecutter = File(archetype, "cookiecutter.json").exists()
        val hasMaven = File(archetype, "META-INF/maven/archetype-metadata.xml").exists()

        if (!hasCopier && !hasCookiecutter && !hasMaven) {
            logger.error("No template configuration file found (copier.yml, cookiecutter.json, or archetype-metadata.xml)")
            valid = false
        }

        if (valid) {
            logger.lifecycle("✓ Archetype validation passed")
        } else {
            throw GradleException("Archetype validation failed")
        }
    }
}

abstract class ScaffoldProjectTask : DefaultTask() {
    @get:InputDirectory
    abstract val archetypeDir: DirectoryProperty

    @get:Input
    abstract val projectName: Property<String>

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Input
    abstract val registerArchitecture: Property<Boolean>

    @TaskAction
    fun scaffold() {
        val archetype = archetypeDir.get().asFile
        val name = projectName.get()
        val output = File(outputDir.get().asFile, name)

        logger.lifecycle("Scaffolding project: $name")
        logger.lifecycle("From archetype: ${archetype.absolutePath}")
        logger.lifecycle("Output: ${output.absolutePath}")

        // Use Copier if available
        if (File(archetype, "copier.yml").exists()) {
            project.exec {
                commandLine("copier", "copy", archetype.absolutePath, output.absolutePath,
                    "--data", "project_name=$name",
                    "--defaults")
            }
        }

        logger.lifecycle("Project scaffolded successfully")
    }
}

abstract class RegisterArchitectureTask : DefaultTask() {
    @get:InputFile
    abstract val workspacePath: RegularFileProperty

    @get:InputDirectory
    abstract val fragmentsPath: DirectoryProperty

    @get:Input
    @get:Optional
    abstract val projectName: Property<String>

    @TaskAction
    fun register() {
        val workspace = workspacePath.get().asFile
        val fragments = fragmentsPath.get().asFile
        val name = projectName.orNull ?: return

        logger.lifecycle("Registering $name in Structurizr workspace")

        // Find fragment for project
        val fragment = File(fragments, "$name.dsl")
        if (fragment.exists()) {
            // Append fragment to workspace
            workspace.appendText("\n\n" + fragment.readText())
            logger.lifecycle("✓ Fragment merged into workspace")
        }

        // Validate workspace
        project.exec {
            commandLine("structurizr-cli", "validate", "-workspace", workspace.absolutePath)
        }
    }
}

abstract class ExportDiagramsTask : DefaultTask() {
    @get:InputFile
    abstract val workspacePath: RegularFileProperty

    @get:Input
    abstract val formats: ListProperty<String>

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun export() {
        val workspace = workspacePath.get().asFile
        val output = outputDir.get().asFile

        formats.get().forEach { format ->
            val formatDir = File(output, format)
            formatDir.mkdirs()

            project.exec {
                commandLine("structurizr-cli", "export",
                    "-workspace", workspace.absolutePath,
                    "-format", format,
                    "-output", formatDir.absolutePath)
            }

            logger.lifecycle("✓ Exported $format diagrams to: ${formatDir.absolutePath}")
        }
    }
}

abstract class PublishHarnessTemplatesTask : DefaultTask() {
    @get:InputDirectory
    abstract val archetypeDir: DirectoryProperty

    @get:Input
    abstract val harnessOrg: Property<String>

    @get:Input
    abstract val harnessProject: Property<String>

    @get:Input
    abstract val templateTypes: ListProperty<String>

    @get:Input
    abstract val publish: Property<Boolean>

    @TaskAction
    fun publishTemplates() {
        val archetype = archetypeDir.get().asFile
        val templatesDir = File(archetype, "templates/harness")

        if (!templatesDir.exists()) {
            logger.lifecycle("No Harness templates found")
            return
        }

        templateTypes.get().forEach { type ->
            val typeDir = File(templatesDir, "${type}s")
            if (typeDir.exists()) {
                typeDir.listFiles()?.filter { it.extension == "yaml" }?.forEach { template ->
                    logger.lifecycle("Publishing $type template: ${template.name}")

                    if (publish.get()) {
                        // Publish to Harness
                        // Implementation: use Harness API
                    }
                }
            }
        }
    }
}

abstract class PushGitHubPagesTask : DefaultTask() {
    @get:InputDirectory
    abstract val diagramsDir: DirectoryProperty

    @get:Input
    @get:Optional
    abstract val repoUrl: Property<String>

    @TaskAction
    fun push() {
        val diagrams = diagramsDir.get().asFile
        val repo = repoUrl.orNull ?: return

        logger.lifecycle("Pushing diagrams to GitHub Pages: $repo")

        // Implementation: git operations to push to gh-pages branch
    }
}

// Apply plugin
apply<ArchetypePlugin>()
