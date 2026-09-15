# Holiday Events – CI/CD Project

Holiday Events is a Node.js and Express application that allows employees to view holiday events and register for them.

This project adds a complete CI/CD environment using GitHub, Jenkins, Docker, Docker Hub, and Ansible.

## Project Structure

```text
holiday-project/
├── ansible/
│   ├── deploy.yml          # Ansible deployment Playbook
│   └── inventory.ini       # Deployment server configuration
├── data/
│   └── events.json         # Holiday events data
├── public/
│   ├── app.js              # Frontend JavaScript
│   ├── index.html          # Main frontend page
│   └── styles.css           # Application styles
├── compose.yml             # Local Docker Compose configuration
├── Dockerfile              # Application Docker image
├── Jenkinsfile             # Jenkins CI/CD Pipeline
├── package.json            # Node.js dependencies and scripts
├── package-lock.json       # Locked dependency versions
└── server.js               # Express server and API
```

## How the Pipeline Works

The Pipeline starts automatically after a change is merged or pushed to the `main` branch.

```text
GitHub
→ Jenkins
→ Install Dependencies
→ Test Application
→ Build Docker Image
→ Tag Docker Image
→ Push Image to Docker Hub
→ Ansible
→ Deployment Server
→ Health Check
→ Running Application
```

The Jenkins Pipeline performs the following steps:

1. Checks out the latest code from the `main` branch.
2. Installs dependencies using `npm ci`.
3. Validates and starts the application on test port `3001`.
4. Checks the test application through `GET /health`.
5. Builds a Docker image using the Jenkins build number.
6. Tags the image with the build number and `latest`.
7. Pushes both image tags to Docker Hub.
8. Runs the Ansible deployment Playbook.
9. Ansible deploys the exact image created by Jenkins.
10. Verifies the deployed application through `GET /health`.

No manual Jenkins build or manual Ansible deployment is required.

## Required Machines and Servers

| Machine or service       | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| Development machine      | Source-code changes, Git, Docker Desktop, and WSL |
| Jenkins container        | Executes the complete CI/CD Pipeline              |
| Docker Hub               | Stores the application Docker images              |
| Ubuntu deployment server | Runs the deployed application container           |
| GitHub repository        | Stores the source code and triggers Jenkins       |

Current environment:

| Component            | Address                       |
| -------------------- | ----------------------------- |
| Jenkins              | `http://localhost:8000`       |
| Deployment server    | `192.168.50.133`              |
| Deployment user      | `tomer`                       |
| Docker Hub image     | `tomerkrivizki19/holiday-app` |
| Deployed application | `http://192.168.50.133:3000`  |

The Jenkins container must have network and SSH access to the Ubuntu deployment server.

## Deployment Process

Deployment is performed by `ansible/deploy.yml`.

The Ansible Playbook:

1. Connects to the Ubuntu deployment server over SSH.
2. Installs Docker and the required Python Docker library.
3. Ensures that the Docker service is enabled and running.
4. Pulls the image created by the current Jenkins build.
5. Stops and removes the previous application container.
6. Starts a new container using the new image.
7. Maps server port `3000` to container port `3000`.
8. Calls the `/health` endpoint.
9. Confirms that the application is healthy and running the expected version.

The deployed image format is:

```text
tomerkrivizki19/holiday-app:<JENKINS_BUILD_NUMBER>
```

## Application Ports

| Service                   | Port   |
| ------------------------- | ------ |
| Holiday application       | `3000` |
| Jenkins web interface     | `8000` |
| Jenkins internal web port | `8080` |
| Jenkins test application  | `3001` |

The deployed application is available at:

```text
http://192.168.50.133:3000
```

The health endpoint is available at:

```text
http://192.168.50.133:3000/health
```

Example response:

```json
{
  "status": "healthy",
  "service": "holiday-events",
  "version": "18"
}
```

The returned version should match the Jenkins build number and Docker image tag.

## Important Configuration

### Jenkins Job

The Jenkins job uses the following configuration:

```text
Definition: Pipeline script from SCM
SCM: Git
Repository: https://github.com/tomerkrivzki19/holiday-project.git
Branch: */main
Script Path: Jenkinsfile
Trigger: GitHub hook trigger for GITScm polling
```

### GitHub Webhook

Because Jenkins runs locally, ngrok provides a public HTTPS address:

```bash
ngrok http 8000
```

The GitHub webhook URL must use the current ngrok domain:

```text
https://<ngrok-domain>/github-webhook/
```

Webhook settings:

```text
Content type: application/json
Event: Push
Active: Yes
```

Ngrok must remain running during automatic Pipeline executions. If the ngrok address changes, the GitHub webhook URL must also be updated.

### Jenkins Credentials

The following credentials must exist in Jenkins:

| Credential ID           | Type                          | Purpose                              |
| ----------------------- | ----------------------------- | ------------------------------------ |
| `dockerhub-credentials` | Username with password        | Docker Hub username and access token |
| `holiday-deploy-ssh`    | SSH username with private key | SSH access to the deployment server  |

Passwords, access tokens, and private SSH keys must not be committed to GitHub.

### Jenkins Requirements

The Jenkins environment requires:

- Git
- Node.js and npm
- Docker CLI
- Access to the Docker daemon
- curl
- Ansible
- OpenSSH client
- `community.docker` Ansible collection

Install the Ansible Docker collection with:

```bash
ansible-galaxy collection install community.docker
```

### Deployment Server Requirements

The Ubuntu deployment server requires:

- Python 3
- SSH access
- Docker
- Public SSH key for the Jenkins deployment credential
- Passwordless sudo for the isolated class environment

Required sudo configuration:

```text
tomer ALL=(ALL:ALL) NOPASSWD: ALL
```

### Ansible Inventory

The deployment server is configured in `ansible/inventory.ini`:

```ini
[deployment_servers]
holiday-server ansible_host=192.168.50.133 ansible_user=tomer ansible_python_interpreter=/usr/bin/python3 ansible_become=true ansible_become_method=sudo ansible_become_flags="-n"
```

## Local Development

Install dependencies:

```bash
npm ci
```

Start the application:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Run with Docker Compose:

```bash
docker compose up -d --build
```

Check the local health endpoint:

```bash
curl http://localhost:3000/health
```

Stop the local environment:

```bash
docker compose down
```

## Final CI/CD Test

To demonstrate the complete automatic process:

1. Create a feature branch.
2. Make and commit an application change.
3. Push the feature branch to GitHub.
4. Open a Pull Request into `main`.
5. Merge the Pull Request.
6. GitHub automatically triggers Jenkins through the webhook.
7. Jenkins builds, tests, publishes, and deploys the application.
8. Ansible verifies the deployed `/health` endpoint.

After deployment, verify the application:

```bash
curl http://192.168.50.133:3000/health
```

Verify the image running on the deployment server:

```bash
docker inspect holiday-container --format '{{.Config.Image}}'
```

The following values should match:

```text
Jenkins build number
Docker image tag
Health endpoint version
```
