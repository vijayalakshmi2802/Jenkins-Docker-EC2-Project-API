
pipeline {
    agent any

    environment {
        IMAGE_NAME = "vijayalakshmi2802/devops-task-api"
        IMAGE_TAG  = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & Lint') {
            steps {
                sh '''
                    set -e
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install -r requirements-dev.txt
                    flake8 app tests wsgi.py
                '''
            }
        }

        stage('Unit Tests') {
            steps {
                sh '''
                    set -e
                    . venv/bin/activate
                    pytest -v
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e
                    docker build \
                        -t "$IMAGE_NAME:$IMAGE_TAG" \
                        -t "$IMAGE_NAME:latest" .
                '''
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DH_USER',
                        passwordVariable: 'DH_PASS'
                    )
                ]) {
                    sh '''
                        set -e
                        echo "$DH_PASS" | docker login \
                            -u "$DH_USER" --password-stdin

                        docker push "$IMAGE_NAME:$IMAGE_TAG"
                        docker push "$IMAGE_NAME:latest"
                    '''
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'ec2-host',
                        variable: 'EC2_HOST'
                    ),
                    file(
                        credentialsId: 'db-env-file',
                        variable: 'ENV_FILE'
                    )
                ]) {
                    sshagent(['ec2-ssh-key']) {
                        sh '''
                            set -e

                            echo "Checking EC2 SSH connection..."

                            ssh \
                                -o StrictHostKeyChecking=no \
                                -o ConnectTimeout=10 \
                                "$EC2_HOST" \
                                "whoami && hostname"

                            echo "Creating deployment directory..."

                            ssh -o StrictHostKeyChecking=no \
                                "$EC2_HOST" \
                                "mkdir -p ~/devops-task-api"

                            echo "Copying Docker Compose configuration..."

                            scp -o StrictHostKeyChecking=no \
                                docker-compose.prod.yml \
                                "$EC2_HOST:~/devops-task-api/docker-compose.yml"

                            echo "Copying database environment file..."

                            scp -o StrictHostKeyChecking=no \
                                "$ENV_FILE" \
                                "$EC2_HOST:~/devops-task-api/.env"

                            echo "Copying deployment script..."

                            scp -o StrictHostKeyChecking=no \
                                scripts/deploy.sh \
                                "$EC2_HOST:~/devops-task-api/deploy.sh"

                            echo "Deploying application..."

                            ssh -o StrictHostKeyChecking=no \
                                "$EC2_HOST" \
                                "cd ~/devops-task-api && IMAGE=$IMAGE_NAME:$IMAGE_TAG bash deploy.sh"

                            echo "Deployment command completed."
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully. Image: ${IMAGE_NAME}:${IMAGE_TAG}"
        }

        failure {
            echo "Pipeline failed. Check the Console Output for the failing stage."
        }

        always {
            sh 'docker logout || true'
        }
    }
}
