<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# Build and push the production Superset image to GitLab

This builds a production image from **local source** (lean app + drivers in
`Dockerfile.prod`), then pushes it to the GitLab Container Registry.

## Prerequisites

- Docker installed and running
- Access to the GitLab project registry
- Code changes committed (or at least present) on the branch you want to bake in

## 1. Choose an image tag

Use a new tag for each release so deploy can pin a known version.

Example:

```bash
export IMAGE_TAG=registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.2
```

Replace the project path and tag to match your GitLab group/project.

## 2. Build the image

From the Superset repo root:

```bash
cd /path/to/superset

./scripts/build-prod-image.sh
```

Or with an explicit tag:

```bash
IMAGE_TAG=registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.2 \
  ./scripts/build-prod-image.sh
```

What the script does:

1. `docker build --target lean` — compiles frontend + backend from this checkout
2. `docker build -f Dockerfile.prod` — adds drivers (Postgres, Trino, Authlib, etc.)

First build can take a long time.

### Verify

```bash
docker images | grep -E 'superset|embed'
```

You should see both `${IMAGE_TAG}` and `${IMAGE_TAG}-lean`.

## 3. Rename / retag an existing image (optional)

Use this when the image is already built locally and you only need a **new tag**
(for example to push under a different name or bump the version label).
`docker tag` adds another name to the same image; it does not rebuild.

```bash
# Existing local image (old name:tag)
export OLD_TAG=plutomen/superset:6.1.0-embed.1

# New name:tag to push to GitLab
export IMAGE_TAG=registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.2

docker tag "${OLD_TAG}" "${IMAGE_TAG}"
```

List images to confirm both tags point at the same image ID:

```bash
docker images | grep -E 'superset|embed'
```

You can also retag from one GitLab tag to another after a pull:

```bash
docker pull registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.1
docker tag \
  registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.1 \
  registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.2
```

Then continue with login and push using `${IMAGE_TAG}`.

## 4. Log in to GitLab Container Registry

```bash
docker login registry.gitlab.com
```

Use a GitLab username and a [Personal Access Token](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
(or Deploy Token) with `read_registry` and `write_registry` scopes.

## 5. Push the image

```bash
docker push "${IMAGE_TAG}"
```

Optional: also push the lean intermediate image (usually not needed for deploy):

```bash
docker push "${IMAGE_TAG}-lean"
```

## 6. Deploy with the new image

In the deploy package (`superset_prod`) `.env`:

```env
SUPERSET_IMAGE=registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.2
```

Then:

```bash
cd /path/to/superset_prod
docker compose pull
docker compose up -d
```

## Manual build (without the script)

```bash
export IMAGE_TAG=registry.gitlab.com/vishalcorea/infrastructure-devops:superset-6.1.0-embed.2
export LEAN_TAG="${IMAGE_TAG}-lean"

docker build --target lean -t "${LEAN_TAG}" .
docker build \
  -f Dockerfile.prod \
  --build-arg "BASE_IMAGE=${LEAN_TAG}" \
  -t "${IMAGE_TAG}" \
  .

docker login registry.gitlab.com
docker push "${IMAGE_TAG}"
```

## Notes

- **lean** = official Superset multi-stage target: runnable app image from source,
  without the extra drivers added by `Dockerfile.prod`.
- Changing `.env` passwords does **not** update an existing admin user in the DB
  volume. Use `superset fab reset-password` or `docker compose down -v` for a wipe.
- Example dashboards load only when `SUPERSET_LOAD_EXAMPLES=yes` and init (or
  `superset load_examples`) actually runs — the image itself does not bake them in.
