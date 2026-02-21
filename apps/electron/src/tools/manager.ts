/**
 * OpenClaw Electron - Tools Manager
 *
 * Manages the bundled tools (Node.js, Python, Git, FFmpeg).
 * Checks for tool availability and handles installation.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ToolDefinition {
  name: string;
  description: string;
  version: string;
  required: boolean;
  checkPath: string | string[];
  downloadUrl?: string;
  executable: string;
}

export interface ToolStatus {
  name: string;
  installed: boolean;
  path?: string;
  version?: string;
}

export const BUNDLED_TOOLS: ToolDefinition[] = [
  {
    name: 'nodejs',
    description: 'Node.js JavaScript Runtime',
    version: '24.13.1',
    required: true,
    checkPath: ['node.exe', 'node'],
    executable: 'node.exe',
  },
  {
    name: 'python',
    description: 'Python Programming Language',
    version: '3.12.0',
    required: true,
    checkPath: ['python.exe', 'python3.exe', 'python'],
    executable: 'python.exe',
  },
  {
    name: 'git',
    description: 'Git Version Control',
    version: '2.43.0',
    required: true,
    checkPath: ['cmd/git.exe', 'bin/git.exe', 'git.exe', 'git'],
    executable: 'git.exe',
  },
  {
    name: 'ffmpeg',
    description: 'FFmpeg Multimedia Framework',
    version: '7.0.0',
    required: true,
    checkPath: ['bin/ffmpeg.exe', 'ffmpeg.exe', 'ffmpeg'],
    executable: 'ffmpeg.exe',
  },
];

/**
 * Check if a tool is installed and available
 */
export async function checkTool(
  resourcesPath: string,
  tool: ToolDefinition,
): Promise<ToolStatus> {
  const toolDir = path.join(resourcesPath, 'tools', tool.name);

  // Check if tool directory exists
  if (!fs.existsSync(toolDir)) {
    return { name: tool.name, installed: false };
  }

  // Check for executable
  const checkPaths = Array.isArray(tool.checkPath) ? tool.checkPath : [tool.checkPath];

  for (const relativePath of checkPaths) {
    const fullPath = path.join(toolDir, relativePath);

    if (fs.existsSync(fullPath)) {
      return {
        name: tool.name,
        installed: true,
        path: fullPath,
        version: tool.version,
      };
    }
  }

  // Directory exists but executable not found
  return { name: tool.name, installed: false };
}

/**
 * Check all bundled tools
 */
export async function checkTools(
  resourcesPath: string,
): Promise<Record<string, ToolStatus>> {
  const result: Record<string, ToolStatus> = {};

  for (const tool of BUNDLED_TOOLS) {
    result[tool.name] = await checkTool(resourcesPath, tool);
  }

  return result;
}

/**
 * Get the PATH variable for running tools
 */
export function getToolsPath(resourcesPath: string): string[] {
  const paths: string[] = [];

  for (const tool of BUNDLED_TOOLS) {
    const toolDir = path.join(resourcesPath, 'tools', tool.name);

    if (fs.existsSync(toolDir)) {
      paths.push(toolDir);
      paths.push(path.join(toolDir, 'bin'));
      paths.push(path.join(toolDir, 'cmd'));
    }
  }

  return paths;
}

/**
 * Get the full path to a tool executable
 */
export function getToolExecutable(
  resourcesPath: string,
  toolName: string,
): string | null {
  const tool = BUNDLED_TOOLS.find((t) => t.name === toolName);

  if (!tool) {
    return null;
  }

  const toolDir = path.join(resourcesPath, 'tools', toolName);

  if (!fs.existsSync(toolDir)) {
    return null;
  }

  const checkPaths = Array.isArray(tool.checkPath) ? tool.checkPath : [tool.checkPath];

  for (const relativePath of checkPaths) {
    const fullPath = path.join(toolDir, relativePath);

    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Check if all required tools are installed
 */
export function areRequiredToolsInstalled(
  status: Record<string, ToolStatus>,
): boolean {
  return BUNDLED_TOOLS
    .filter((tool) => tool.required)
    .every((tool) => status[tool.name]?.installed === true);
}

/**
 * Get missing required tools
 */
export function getMissingRequiredTools(
  status: Record<string, ToolStatus>,
): ToolDefinition[] {
  return BUNDLED_TOOLS.filter(
    (tool) => tool.required && status[tool.name]?.installed !== true,
  );
}
