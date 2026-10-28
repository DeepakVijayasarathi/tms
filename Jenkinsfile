pipeline {
    agent any

    environment {
        IMAGE_NAME     = 'deepakrajv/tms'
        CONTAINER_NAME = 'tms'
        GITHUB_REPO    = 'https://github.com/DeepakVijayasarathi/tms.git'
        DOCKER_NETWORK = 'tms-network'
        HOST_PORT      = '8080'
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                git(
                    branch: 'main',
                    url: "${GITHUB_REPO}",
                    credentialsId: 'github'
                )
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                      --tag "${IMAGE_NAME}:latest" \
                      --file Dockerfile .
                '''
            }
        }

        stage('Create Docker Network') {
            steps {
                sh '''
                    docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1 || \
                    docker network create "${DOCKER_NETWORK}"
                '''
            }
        }

        stage('Deploy Container') {
            steps {
                sh '''
                    docker rm --force "${CONTAINER_NAME}" >/dev/null 2>&1 || true

                    docker run --detach \
                      --name "${CONTAINER_NAME}" \
                      --network "${DOCKER_NETWORK}" \
                      --publish "${HOST_PORT}:80" \
                      --restart unless-stopped \
                      "${IMAGE_NAME}:latest"
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    attempt=1
                    until curl --fail --silent "http://127.0.0.1:${HOST_PORT}/" >/dev/null; do
                        if [ "$attempt" -ge 12 ]; then
                            docker logs --tail 100 "${CONTAINER_NAME}"
                            exit 1
                        fi
                        sleep 5
                        attempt=$((attempt + 1))
                    done

                    docker ps --filter "name=^/${CONTAINER_NAME}$" --filter status=running
                    docker logs --tail 50 "${CONTAINER_NAME}"
                '''
            }
        }
    }

    post {
        success {
            echo 'TMS frontend deployed successfully on port 8080.'
        }

        failure {
            sh 'docker logs --tail 100 "${CONTAINER_NAME}" || true'
            echo 'TMS frontend deployment failed. Check the Jenkins console logs.'
        }

        always {
            cleanWs()
        }
    }
}
