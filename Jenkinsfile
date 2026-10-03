// Declarative pipeline: GitHub webhook -> test -> build image -> push -> deploy to EC2
// Jenkins credentials needed (Manage Jenkins > Credentials):
//   dockerhub-creds  : Username/password for Docker Hub
//   ec2-ssh-key      : SSH private key for the EC2 deploy user
//   ec2-host         : Secret text, e.g. ubuntu@<your-elastic-ip>
//   db-env-file      : Secret file containing POSTGRES_* values (copy of .env)
pipeline {
    agent any

    environment {
        IMAGE_NAME = "YOUR_DOCKERHUB_USERNAME/devops-task-api"
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install & Lint') {
            steps {
                sh '''
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
                    . venv/bin/activate
                    pytest -v
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$IMAGE_TAG -t $IMAGE_NAME:latest .'
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                    sh '''
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        docker push $IMAGE_NAME:$IMAGE_TAG
                        docker push $IMAGE_NAME:latest
                    '''
                }
            }
        }

        stage('Deploy to EC2') {
            when { branch 'main' }
            steps {
                withCredentials([
                    string(credentialsId: 'ec2-host', variable: 'EC2_HOST'),
                    file(credentialsId: 'db-env-file', variable: 'ENV_FILE')
                ]) {
                    sshagent(['ec2-ssh-key']) {
                        sh '''
                            ssh -o StrictHostKeyChecking=no $EC2_HOST "mkdir -p ~/devops-task-api"
                            scp -o StrictHostKeyChecking=no docker-compose.prod.yml $EC2_HOST:~/devops-task-api/docker-compose.yml
                            scp -o StrictHostKeyChecking=no $ENV_FILE $EC2_HOST:~/devops-task-api/.env
                            scp -o StrictHostKeyChecking=no scripts/deploy.sh $EC2_HOST:~/devops-task-api/deploy.sh
                            ssh -o StrictHostKeyChecking=no $EC2_HOST "cd ~/devops-task-api && IMAGE=$IMAGE_NAME:$IMAGE_TAG bash deploy.sh"
                        '''
                    }
                }
            }
        }
    }

    post {
        success { echo "Deployed ${IMAGE_NAME}:${IMAGE_TAG}" }
        failure { echo "Pipeline failed - check the stage logs above." }
        always  { sh 'docker logout || true' }
    }
}
