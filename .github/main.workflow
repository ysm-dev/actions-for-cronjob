workflow "New workflow" {
  resolves = ["deploy"]
  on = "schedule(*/5 * * * *)"
}

action "Install" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  args = "i"
}

action "deploy" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  args = "dev"
  secrets = ["GH_PAT"]
  needs = ["Install"]
}
