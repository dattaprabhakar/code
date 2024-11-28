pipeline {
    agent any

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'main', description: 'Branch to build and test')
    }

    environment {
        SOURCE_REPO = 'https://github.com/dattaprabhakar/code.git'
        ARTIFACTS_REPO = 'https://github.com/dattaprabhakar/binaries.git'
        NODE_VERSION = '16.14.0'
    }

    options {
        timestamps() // Adds timestamps to logs for better debugging
        disableConcurrentBuilds() // Prevents overlapping builds on the same branch
        ansiColor('xterm') // Enables colorized console output
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo "Checking out code from branch: ${params.BRANCH_NAME}"
                git branch: params.BRANCH_NAME, credentialsId: 'localgit', url: env.SOURCE_REPO
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    // Install Node.js dependencies
                    nodejs(nodeJSInstallationName: 'NodeJS16.14.0') {
                        sh 'npm ci' // Clean install (faster and more predictable)
                    }
                }
            }
        }

        stage('Code Quality Checks') {
            steps {
                script {
                    // Lint the code for static analysis
                    sh 'npm run lint'
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    // Run unit and integration tests
                    sh 'npm test'
                }
            }
        }

        stage('Build Application') {
            steps {
                script {
                    // Build the application
                    nodejs(nodeJSInstallationName: 'NodeJS16.14.0') {
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('Package Artifacts') {
            steps {
                script {
                    // Create a tarball of build artifacts
                    sh """
                        mkdir -p artifacts
                        tar -czf artifacts/build-${params.BRANCH_NAME}.tar.gz -C build .
                    """
                }
            }
        }

        stage('Push Artifacts to Git Repository') {
            steps {
                script {
                    // Clone the artifacts repository and push artifacts
                    sh """
                        rm -rf binaries_repo
                        git clone ${env.ARTIFACTS_REPO} binaries_repo
                        cd binaries_repo
                        git checkout -b ${params.BRANCH_NAME} || git checkout ${params.BRANCH_NAME}
                        rm -rf *
                        cp ../artifacts/build-${params.BRANCH_NAME}.tar.gz .
                        git add .
                        git config user.email "jenkins@company.com"
                        git config user.name "Jenkins CI"
                        git commit -m "CI Build Artifacts for ${params.BRANCH_NAME}"
                        git push origin ${params.BRANCH_NAME}
                    """
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'artifacts/build-*.tar.gz', allowEmptyArchive: true
            cleanWs() // Clean workspace after build
        }
        success {
            echo 'CI Pipeline completed successfully.'
        }
        failure {
            echo 'CI Pipeline failed. Please check the logs.'
        }
    }
}
