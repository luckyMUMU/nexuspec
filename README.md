# NexusSpec CLI (nxsp)

Distributed spec system with deep OpenSpec 1.3 integration.

## Features

- 🚀 **Deep OpenSpec Integration** - Direct integration with OpenSpec 1.3's new OPSX workflow
- 📦 **Namespace Management** - Tree-structured spec system with shared contracts
- 🤝 **Cross-Service Proposals** - CSP (Cross-Service Proposal) system for coordinated changes
- 🔗 **Contract Versioning** - Versioned API and event contracts with lifecycle management
- ⚡ **Optimized Performance** - 20%+ faster than previous versions through direct API integration

## Installation

```bash
npm install -g @nexus-spec/cli
```

Requires Node.js 20.19.0+.

## Quick Start

```bash
# Initialize a new service
nxsp init --namespace git@github.com:your-org/your-namespace.git --service your-service

# Create a cross-service proposal
nxsp propose --title "Add new API endpoint" --target other-service --contract-type api

# Review proposals
nxsp review

# Accept a proposal
nxsp accept CSP-ABC123

# Archive when done
nxsp archive CSP-ABC123
```

## Commands

### Core NexusSpec Commands

| Command | Description |
|---------|-------------|
| `nxsp init` | Initialize NexusSpec in your project |
| `nxsp propose` | Create a cross-service proposal (CSP) |
| `nxsp review` | Review pending proposals |
| `nxsp accept <id>` | Accept a proposal |
| `nxsp reject <id>` | Reject a proposal |
| `nxsp apply` | Apply a change (delegates to openspec) |
| `nxsp archive [id]` | Archive completed changes and proposals |
| `nxsp sync` | Sync with namespace |
| `nxsp sync-contracts` | Sync contracts to namespace |
| `nxsp contract promote <name>` | Promote a contract version |
| `nxsp contract retire <name>` | Retire a contract version |
| `nxsp impact` | Analyze impact of changes |
| `nxsp tree` | Display namespace spec tree |

### OpenSpec Proxy Commands

All OpenSpec commands are available directly:

```bash
# Direct proxy to openspec
nxsp openspec <command>

# Or use convenience aliases
nxsp status
nxsp list
nxsp view
nxsp validate
nxsp show
nxsp schemas
nxsp new change <name>
```

## Architecture

### Namespace Structure

```
your-namespace/
├── spec/
│   ├── namespace.md
│   ├── shared/
│   │   ├── common-types.yaml
│   │   └── error-codes.yaml
│   └── policies/
├── contracts/
│   ├── service-a/
│   │   ├── api/
│   │   │   ├── v1.yaml
│   │   │   └── v2.yaml
│   │   └── events/
│   ├── service-b/
│   └── external/
├── proposals/
│   ├── active/
│   └── archive/
└── graph/
```

### Command Mapping

The nxsp CLI maps commands to OpenSpec 1.3's new OPSX workflow:

| nxsp Command | OpenSpec Equivalent | Notes |
|--------------|---------------------|-------|
| `nxsp propose` | `/opsx:new` + `/opsx:ff` | Creates CSP + contract draft |
| `nxsp accept` | `/opsx:new` + `/opsx:ff` | Pulls proposal + activates contract |
| `nxsp apply` | `/opsx:apply` | Direct delegate |
| `nxsp archive` | `/opsx:archive` | Delegate + sync contracts |
| `nxsp sync` | `openspec update` | Sync specs |

## Configuration

`.nxsp/config.yaml`:

```yaml
service:
  name: your-service
  team: your-team
namespace:
  remote: git@github.com:your-org/your-namespace.git
  localPath: ~/.nxsp/namespaces/your-namespace
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
  - type: events
    path: src/events/schemas/
    name: default
depends:
  loyalty-api: contract://loyalty-service/api/default:v1
  notification-events: contract://notification-service/events/default:v1
sharedTypes:
  - common-types
  - error-codes
```

## OpenSpec 1.3 New Features Integration

### OPSX Workflow

nxsp directly integrates with OpenSpec 1.3's new OPSX (OpenSpec eXtended) workflow:

- `/opsx:new` - Create a new change scaffold
- `/opsx:continue` - Incrementally create artifacts
- `/opsx:ff` - Fast-forward all planning artifacts
- `/opsx:apply` - Apply tasks
- `/opsx:archive` - Archive completed changes

### Schema-Driven Configuration

Uses OpenSpec 1.3's `openspec/config.yaml` for project configuration and context injection.

### Skill System

Works seamlessly with OpenSpec's skill system for AI assistant integration.

## Performance

This version delivers **20%+ performance improvement** through:

- Direct API integration instead of subprocess spawning
- Optimized command mapping
- Cached config loading
- Batch operations for sync

## 📚 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

- [User Guide](docs/user-guide/getting-started.md) - Get started with NexusSpec
- [CLI Reference](docs/cli-reference/commands.md) - Complete command reference
- [Architecture](docs/architecture/overview.md) - System architecture and core concepts
- [Training Materials](docs/training/introduction.md) - Training courses and tutorials
- [Examples](docs/examples/README.md) - Code examples and walkthroughs
- [Community](docs/community/README.md) - Community support and contributing guide

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) or the [community docs](docs/community/README.md) for guidelines on how to contribute to NexusSpec.

## License

MIT
