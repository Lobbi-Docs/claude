---
description: Generate Ansible playbooks and roles for server provisioning and configuration management
argument-hint: "[name] --target [server|k8s|docker]"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith Ansible

Generate production-ready Ansible playbooks, roles, and inventories for automated server provisioning and configuration management.

## Usage
```
/zenith:ansible <name> [options]
```

## Arguments
- `name` - Ansible project name (required)

## Options
- `--target <type>` - Deployment target (default: server)
  - `server` - Bare metal/VM servers
  - `k8s` - Kubernetes cluster setup
  - `docker` - Docker host configuration
- `--os <system>` - Operating system (default: ubuntu)
  - `ubuntu` - Ubuntu 22.04/24.04
  - `debian` - Debian 11/12
  - `centos` - CentOS 8/9
  - `rhel` - Red Hat Enterprise Linux
- `--stack <components>` - Stack to install (comma-separated)
  - `web` - Nginx/Apache
  - `app` - Application runtime (Python/Node)
  - `db` - Database (PostgreSQL/MySQL/MongoDB)
  - `cache` - Redis/Memcached
  - `monitoring` - Prometheus/Grafana
- `--env <environments>` - Environments (default: all)
  - `dev` - Development
  - `staging` - Staging
  - `prod` - Production
  - `all` - All environments

## Project Structure
```
<name>/
├── inventories/
│   ├── dev/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   ├── staging/
│   └── prod/
├── roles/
│   ├── common/
│   │   ├── tasks/
│   │   ├── handlers/
│   │   ├── templates/
│   │   ├── files/
│   │   └── defaults/
│   ├── webserver/
│   ├── appserver/
│   ├── database/
│   └── monitoring/
├── playbooks/
│   ├── site.yml
│   ├── webservers.yml
│   ├── databases.yml
│   └── monitoring.yml
├── group_vars/
│   ├── all.yml
│   ├── webservers.yml
│   └── databases.yml
├── host_vars/
├── ansible.cfg
├── requirements.yml
└── README.md
```

## Included Roles

### Common
- System updates
- Security hardening
- User management
- SSH configuration
- Firewall setup (ufw/firewalld)
- NTP configuration
- Fail2ban

### Webserver
- Nginx/Apache installation
- SSL/TLS configuration
- Virtual host setup
- Load balancer config
- Log rotation

### Appserver
- Python/Node.js runtime
- Application deployment
- Systemd service setup
- Environment variables
- Process management (supervisor/pm2)

### Database
- PostgreSQL/MySQL/MongoDB
- Database creation
- User management
- Backup configuration
- Replication setup

### Monitoring
- Prometheus
- Node exporter
- Grafana
- Alertmanager
- Log aggregation (ELK/Loki)

### Docker
- Docker engine installation
- Docker Compose
- Container management
- Registry setup
- Network configuration

### Kubernetes
- Kubeadm/K3s installation
- Control plane setup
- Worker node joining
- CNI plugin (Calico/Flannel)
- Ingress controller

## Examples

```bash
# Basic web server setup
/zenith:ansible webserver-setup --target server --stack web,app --os ubuntu

# Full stack with database and monitoring
/zenith:ansible fullstack --target server --stack web,app,db,monitoring --env all

# Docker host configuration
/zenith:ansible docker-hosts --target docker --os debian --env prod

# Kubernetes cluster setup
/zenith:ansible k8s-cluster --target k8s --os ubuntu --env prod
```

## Playbook Examples

### Deploy Web Application
```yaml
ansible-playbook -i inventories/prod/hosts.yml playbooks/site.yml
```

### Update Specific Servers
```yaml
ansible-playbook -i inventories/prod/hosts.yml playbooks/webservers.yml --tags update
```

### Check Configuration
```yaml
ansible-playbook -i inventories/prod/hosts.yml playbooks/site.yml --check
```

### Deploy to Specific Host
```yaml
ansible-playbook -i inventories/prod/hosts.yml playbooks/site.yml --limit web01
```

## Features

### Security
- SSH key-based authentication
- Firewall configuration
- Fail2ban integration
- SELinux/AppArmor
- Automated security updates
- SSL/TLS certificate management

### Configuration Management
- Idempotent operations
- Template-based configs
- Variable management
- Encrypted secrets (Ansible Vault)
- Dynamic inventories

### Deployment
- Zero-downtime deployment
- Rolling updates
- Health checks
- Rollback capability
- Blue-green deployment

### Monitoring
- Service health checks
- Log collection
- Metrics gathering
- Alert configuration
- Performance monitoring

## Inventory Example

```yaml
# inventories/prod/hosts.yml
all:
  children:
    webservers:
      hosts:
        web01:
          ansible_host: 10.0.1.10
        web02:
          ansible_host: 10.0.1.11
    databases:
      hosts:
        db01:
          ansible_host: 10.0.2.10
```

## Variable Management

### Group Variables
```yaml
# group_vars/webservers.yml
nginx_version: "1.24"
ssl_enabled: true
max_upload_size: "100M"
```

### Host Variables
```yaml
# host_vars/web01.yml
server_name: "web01.example.com"
ssl_cert_path: "/etc/ssl/certs/web01.crt"
```

### Encrypted Secrets
```bash
# Create vault
ansible-vault create group_vars/all/vault.yml

# Edit vault
ansible-vault edit group_vars/all/vault.yml
```

## Agent Assignment
This command activates the **zenith-ansible-builder** agent for execution.

## Prerequisites
- Ansible 2.14+
- Python 3.8+
- SSH access to target servers
- Sudo privileges on targets

## Post-Creation Steps
1. Configure inventory files
2. Set up SSH keys
3. Update group/host variables
4. Encrypt sensitive data with Ansible Vault
5. Test with `--check` flag
6. Run playbooks

## Best Practices
- Use roles for modularity
- Encrypt secrets with Vault
- Use tags for selective execution
- Implement idempotency
- Test in dev before prod
- Version control all configs
- Document custom roles
- Use handlers for service restarts
