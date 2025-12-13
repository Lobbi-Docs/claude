/**
 * Plugin Bundler
 * Handles packaging plugins for distribution
 */

import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import archiver from 'archiver';
import { BundleOptions, Plugin, PluginManifest } from './types';

export class PluginBundler {
  /**
   * Main bundling method
   */
  async bundle(pluginPath: string, options: BundleOptions = {}): Promise<string> {
    const spinner = ora('Loading plugin...').start();

    try {
      const absolutePath = path.resolve(pluginPath);
      const manifestPath = path.join(absolutePath, '.claude-plugin', 'plugin.json');

      if (!await fs.pathExists(manifestPath)) {
        throw new Error('plugin.json not found');
      }

      const manifest: PluginManifest = await fs.readJSON(manifestPath);
      spinner.text = `Bundling ${manifest.name}@${manifest.version}`;

      // Determine output path
      const outputDir = options.output
        ? path.resolve(options.output)
        : path.join(absolutePath, 'dist');

      await fs.ensureDir(outputDir);

      const outputFile = path.join(
        outputDir,
        `${manifest.name}-${manifest.version}.cpkg`
      );

      // Tree-shake if requested
      let bundleManifest = manifest;
      if (options.treeShake) {
        spinner.text = 'Tree-shaking unused resources...';
        bundleManifest = await this.treeShake(absolutePath, manifest);
      }

      // Minify if requested
      if (options.minify) {
        spinner.text = 'Minifying manifests...';
        bundleManifest = this.minifyManifest(bundleManifest);
      }

      // Create archive
      spinner.text = 'Creating package archive...';
      await this.createPackage(absolutePath, bundleManifest, outputFile, options);

      spinner.succeed(chalk.green(`Plugin bundled successfully!`));
      return outputFile;
    } catch (error) {
      spinner.fail();
      throw error;
    }
  }

  /**
   * Tree-shake unused resources
   */
  async treeShake(pluginPath: string, manifest: PluginManifest): Promise<PluginManifest> {
    // Create a copy of the manifest
    const optimized = JSON.parse(JSON.stringify(manifest));

    // Remove empty sections
    if (optimized.agents && Object.keys(optimized.agents).length === 0) {
      delete optimized.agents;
    }
    if (optimized.skills && Object.keys(optimized.skills).length === 0) {
      delete optimized.skills;
    }
    if (optimized.commands && Object.keys(optimized.commands).length === 0) {
      delete optimized.commands;
    }
    if (optimized.hooks && Object.keys(optimized.hooks).length === 0) {
      delete optimized.hooks;
    }

    // Remove optional empty arrays
    if (optimized.keywords && optimized.keywords.length === 0) {
      delete optimized.keywords;
    }
    if (optimized.categories && optimized.categories.length === 0) {
      delete optimized.categories;
    }

    return optimized;
  }

  /**
   * Minify manifest JSON
   */
  minifyManifest(manifest: PluginManifest): PluginManifest {
    // Remove unnecessary whitespace from descriptions
    const minified = JSON.parse(JSON.stringify(manifest));

    if (minified.description) {
      minified.description = minified.description.trim().replace(/\s+/g, ' ');
    }

    // Minify agent descriptions
    if (minified.agents) {
      for (const agent of Object.values(minified.agents) as any[]) {
        if (agent.description) {
          agent.description = agent.description.trim().replace(/\s+/g, ' ');
        }
      }
    }

    // Minify skill descriptions
    if (minified.skills) {
      for (const skill of Object.values(minified.skills) as any[]) {
        if (skill.description) {
          skill.description = skill.description.trim().replace(/\s+/g, ' ');
        }
      }
    }

    return minified;
  }

  /**
   * Create .cpkg package archive
   */
  async createPackage(
    pluginPath: string,
    manifest: PluginManifest,
    outputPath: string,
    options: BundleOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      // Add manifest
      archive.append(JSON.stringify(manifest, null, options.minify ? 0 : 2), {
        name: '.claude-plugin/plugin.json'
      });

      // Add agents
      if (manifest.agents) {
        for (const [name, def] of Object.entries(manifest.agents)) {
          const filePath = path.join(pluginPath, def.handler);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: def.handler });
          }
        }
      }

      // Add skills
      if (manifest.skills) {
        for (const [name, def] of Object.entries(manifest.skills)) {
          const filePath = path.join(pluginPath, def.handler);
          if (fs.existsSync(filePath)) {
            // For skills, include the entire directory
            const skillDir = path.dirname(filePath);
            archive.directory(skillDir, path.dirname(def.handler));
          }
        }
      }

      // Add commands
      if (manifest.commands) {
        for (const [name, def] of Object.entries(manifest.commands)) {
          const filePath = path.join(pluginPath, def.handler);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: def.handler });
          }
        }
      }

      // Add hooks
      if (manifest.hooks) {
        for (const [name, def] of Object.entries(manifest.hooks)) {
          const filePath = path.join(pluginPath, def.handler);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: def.handler, mode: 0o755 });
          }
        }
      }

      // Add README and LICENSE if they exist
      const readmePath = path.join(pluginPath, 'README.md');
      if (fs.existsSync(readmePath)) {
        archive.file(readmePath, { name: 'README.md' });
      }

      const licensePath = path.join(pluginPath, 'LICENSE');
      if (fs.existsSync(licensePath)) {
        archive.file(licensePath, { name: 'LICENSE' });
      }

      // Generate source maps if requested
      if (options.sourceMaps) {
        const sourceMap = this.generateSourceMap(manifest);
        archive.append(JSON.stringify(sourceMap, null, 2), {
          name: '.claude-plugin/sourcemap.json'
        });
      }

      archive.finalize();
    });
  }

  /**
   * Generate source map for debugging
   */
  generateSourceMap(manifest: PluginManifest): any {
    const sourceMap = {
      version: 1,
      name: manifest.name,
      bundleVersion: manifest.version,
      timestamp: new Date().toISOString(),
      resources: {
        agents: manifest.agents ? Object.keys(manifest.agents) : [],
        skills: manifest.skills ? Object.keys(manifest.skills) : [],
        commands: manifest.commands ? Object.keys(manifest.commands) : [],
        hooks: manifest.hooks ? Object.keys(manifest.hooks) : []
      }
    };

    return sourceMap;
  }
}
