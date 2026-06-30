pipeline {
  agent any

  triggers {
    pollSCM('H/2 * * * *')
  }

  environment {
    JENKINS_URL = 'https://jenkins.cicd.kits.ext.educentre.fr/'
    SONAR_HOST_URL = 'https://sonarqube.cicd.kits.ext.educentre.fr'
    SONAR_PROJECT_KEY = 'liam-tasklist-backend'
    LOCAL_IMAGE = 'efrei-pro-pipepline-tp4-backend:latest'
    DOCKERHUB_IMAGE = 'liamor2/efrei-pro-pipepline-tp4-backend'
    DOCKER_BUILDKIT = '1'
  }

  stages {
    stage('Install dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Generate Prisma client') {
      steps {
        sh 'npm run prisma:generate'
      }
    }

    stage('Lint and format check') {
      steps {
        sh 'npm run check'
      }
    }

    stage('Unit tests') {
      steps {
        sh 'npm run test:coverage'
        sh 'mkdir -p reports coverage'
        sh 'cp reports/junit.xml reports/junit-unit.xml'
        sh 'cp coverage/lcov.info coverage/unit.lcov.info'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit-unit.xml'
        }
      }
    }

    stage('E2E tests') {
      steps {
        sh 'npm run test:e2e:coverage'
        sh 'cp reports/junit.xml reports/junit-e2e.xml'
        sh 'cp coverage/lcov.info coverage/e2e.lcov.info'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit-e2e.xml'
        }
      }
    }

    stage('SonarQube analysis and Quality Gate') {
      steps {
        withCredentials([string(credentialsId: 'liamor2-sonar-token', variable: 'SONAR_TOKEN')]) {
          sh '''
            docker compose -f docker-compose.ci.yml run --rm \
              -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
              -e SONAR_TOKEN="${SONAR_TOKEN}" \
              -e SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY}" \
              sonar-scanner
          '''
        }
      }
    }

    stage('Docker build') {
      steps {
        sh 'npm run docker:build'
      }
    }

    stage('Trivy scan') {
      steps {
        sh 'npm run trivy:scan'
      }
      post {
        always {
          archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/trivy-vulnerabilities.json'
        }
      }
    }

    stage('Generate SBOM') {
      steps {
        sh 'npm run trivy:sbom'
      }
      post {
        always {
          archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/sbom.cdx.json'
        }
      }
    }

    stage('Push Docker image') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'liamor2-dockerhub-password',
          usernameVariable: 'DOCKERHUB_USERNAME',
          passwordVariable: 'DOCKERHUB_PASSWORD'
        )]) {
          sh '''
            echo "${DOCKERHUB_PASSWORD}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin
            docker tag "${LOCAL_IMAGE}" "${DOCKERHUB_IMAGE}:${BUILD_NUMBER}"
            docker tag "${LOCAL_IMAGE}" "${DOCKERHUB_IMAGE}:latest"
            docker push "${DOCKERHUB_IMAGE}:${BUILD_NUMBER}"
            docker push "${DOCKERHUB_IMAGE}:latest"
            docker logout
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts allowEmptyArchive: true, artifacts: 'coverage/*.lcov.info,reports/*.json,reports/*.xml'
      cleanWs()
    }
  }
}
