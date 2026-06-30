import groovy.transform.Field

@Field Map STAGE_HASHES = [:]

def cacheKey(String stageName) {
  return stageName.toLowerCase().replaceAll(/[^a-z0-9]+/, '-')
}

def cacheDir() {
  def rawJob = env.JOB_NAME ?: 'local-job'
  def jobKey = rawJob.replaceAll(/[^A-Za-z0-9_.-]+/, '_')
  return "${env.HOME}/.jenkins-stage-cache/${jobKey}"
}

def shellQuote(String value) {
  return "'" + value.replace("'", "'\\''") + "'"
}

def computeStageHash(String stageName, List<String> patterns) {
  def quotedPatterns = patterns.collect { shellQuote(it) }.join(' ')
  def hash = sh(
    script: """
      set -eu
      tmp=\$(mktemp)
      for pattern in ${quotedPatterns}; do
        git ls-files -- "\$pattern" >> "\$tmp" || true
      done
      sort -u "\$tmp" | while IFS= read -r file; do
        if [ -f "\$file" ]; then
          sha256sum "\$file"
        fi
      done | sha256sum | awk '{print \$1}'
      rm -f "\$tmp"
    """,
    returnStdout: true
  ).trim()
  STAGE_HASHES[stageName] = hash
  return hash
}

def shouldRunStage(String stageName, List<String> patterns) {
  def hash = computeStageHash(stageName, patterns)
  def marker = "${cacheDir()}/${cacheKey(stageName)}.sha256"
  def hit = sh(
    script: """
      set +e
      test -f ${shellQuote(marker)} && test "\$(cat ${shellQuote(marker)})" = ${shellQuote(hash)}
    """,
    returnStatus: true
  ) == 0

  if (hit) {
    echo "Skipping '${stageName}': same inputs already succeeded (${hash})."
    return false
  }

  echo "Running '${stageName}': inputs changed or no successful cache exists (${hash})."
  return true
}

def markStageSuccess(String stageName) {
  def hash = STAGE_HASHES[stageName]
  if (!hash) {
    error "No stage hash recorded for '${stageName}'."
  }
  def marker = "${cacheDir()}/${cacheKey(stageName)}.sha256"
  sh """
    mkdir -p ${shellQuote(cacheDir())}
    printf '%s\n' ${shellQuote(hash)} > ${shellQuote(marker)}
  """
}

pipeline {
  agent any

  triggers {
    pollSCM('H/2 * * * *')
  }

  environment {
    JENKINS_URL = 'https://jenkins.cicd.kits.ext.educentre.fr/'
    SONAR_HOST_URL = 'https://sonarqube.cicd.kits.ext.educentre.fr'
    SONAR_PROJECT_KEY = 'liam-tasklist-backend2'
    LOCAL_IMAGE = 'efrei-pro-pipepline-tp4-backend:latest'
    DOCKERHUB_IMAGE = 'liamor2/efrei-pro-pipepline-tp4-backend'
    DOCKER_BUILDKIT = '1'
  }

  stages {
    stage('Install dependencies') {
      when { expression { shouldRunStage('Install dependencies', ['Jenkinsfile', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'biome.json', 'src/**', 'prisma/**', 'sonar-project.properties']) } }
      steps { sh 'npm ci --cache "$HOME/.npm-cache" --prefer-offline' }
      post { success { markStageSuccess('Install dependencies') } }
    }

    stage('Generate Prisma client') {
      when { expression { shouldRunStage('Generate Prisma client', ['Jenkinsfile', 'package.json', 'package-lock.json', 'prisma/**']) } }
      steps { sh 'npm run prisma:generate' }
      post { success { markStageSuccess('Generate Prisma client') } }
    }

    stage('Lint and format check') {
      when { expression { shouldRunStage('Lint and format check', ['Jenkinsfile', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'biome.json', 'src/**', 'prisma/**']) } }
      steps { sh 'npm run check' }
      post { success { markStageSuccess('Lint and format check') } }
    }

    stage('Unit tests') {
      when { expression { shouldRunStage('Unit tests', ['Jenkinsfile', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'src/**', 'prisma/**', 'sonar-project.properties']) } }
      steps {
        sh 'npm run test:coverage'
        sh 'mkdir -p reports coverage'
        sh 'cp reports/junit.xml reports/junit-unit.xml'
        sh 'cp coverage/lcov.info coverage/unit.lcov.info'
      }
      post {
        success { markStageSuccess('Unit tests') }
        always { junit allowEmptyResults: true, testResults: 'reports/junit-unit.xml' }
      }
    }

    stage('E2E tests') {
      when { expression { shouldRunStage('E2E tests', ['Jenkinsfile', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'src/**', 'prisma/**', 'sonar-project.properties']) } }
      steps {
        sh 'npm run test:e2e:coverage'
        sh 'cp reports/junit.xml reports/junit-e2e.xml'
        sh 'cp coverage/lcov.info coverage/e2e.lcov.info'
      }
      post {
        success { markStageSuccess('E2E tests') }
        always { junit allowEmptyResults: true, testResults: 'reports/junit-e2e.xml' }
      }
    }

    stage('SonarQube analysis and Quality Gate') {
      when { expression { shouldRunStage('SonarQube analysis and Quality Gate', ['Jenkinsfile', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'src/**', 'prisma/**', 'sonar-project.properties']) } }
      steps {
        withCredentials([string(credentialsId: 'liam-sonar-token-backend', variable: 'SONAR_TOKEN')]) {
          sh '''
            docker compose -f docker-compose.ci.yml run --rm \
              -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
              -e SONAR_TOKEN="${SONAR_TOKEN}" \
              -e SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY}" \
              sonar-scanner
          '''
        }
      }
      post { success { markStageSuccess('SonarQube analysis and Quality Gate') } }
    }

    stage('Docker build') {
      when { expression { shouldRunStage('Docker build', ['Jenkinsfile', 'package.json', 'package-lock.json', 'tsconfig.json', 'src/**', 'prisma/**', 'Dockerfile', 'docker-compose.yml']) } }
      steps { sh 'npm run docker:build' }
      post { success { markStageSuccess('Docker build') } }
    }

    stage('Trivy scan') {
      when { expression { shouldRunStage('Trivy scan', ['Jenkinsfile', 'package.json', 'package-lock.json', 'src/**', 'prisma/**', 'Dockerfile', 'docker-compose.yml', 'docker-compose.ci.yml']) } }
      steps { sh 'npm run trivy:scan' }
      post {
        success { markStageSuccess('Trivy scan') }
        always { archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/trivy-vulnerabilities.json' }
      }
    }

    stage('Generate SBOM') {
      when { expression { shouldRunStage('Generate SBOM', ['Jenkinsfile', 'package.json', 'package-lock.json', 'src/**', 'prisma/**', 'Dockerfile', 'docker-compose.yml', 'docker-compose.ci.yml']) } }
      steps { sh 'npm run trivy:sbom' }
      post {
        success { markStageSuccess('Generate SBOM') }
        always { archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/sbom.cdx.json' }
      }
    }

    stage('Push Docker image') {
      when { expression { shouldRunStage('Push Docker image', ['Jenkinsfile', 'package.json', 'package-lock.json', 'src/**', 'prisma/**', 'Dockerfile', 'docker-compose.yml']) } }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'liam-dockerhub-password',
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
      post { success { markStageSuccess('Push Docker image') } }
    }
  }

  post {
    always {
      archiveArtifacts allowEmptyArchive: true, artifacts: 'coverage/*.lcov.info,reports/*.json,reports/*.xml'
      cleanWs()
    }
  }
}
