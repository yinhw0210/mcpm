# Changelog

All notable changes to MCPM will be documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/) and uses semantic versioning once release tags begin.

## Unreleased

## 0.1.1 - 2026-07-20

### Added

- ZCode agent detection, configuration, and icon support

### Fixed

- Restored independent scrolling for the server and agent lists on the MCP management page
- Removed the macOS repair helper that could itself be blocked by Gatekeeper, and replaced it with documented recovery steps

## 0.1.0 - 2026-07-08

### Added

- Desktop MCP server management for global and project agent configs
- Registry search across the add-mcp registry and the official MCP registry
- Multi-agent install, remove, and sync workflows
- Dashboard status checks for remote servers and managed debug sessions
- Stdio server debugging with live logs, process metrics, and JSON-RPC input
- Runtime detection for Node.js, `npx`, Python, Bun, and `uvx`
- Bilingual Chinese and English UI
- Release guide and versioned GitHub release note source files
