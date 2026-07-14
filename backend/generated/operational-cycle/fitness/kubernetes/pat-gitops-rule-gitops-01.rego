package aiw.architecture

# Conformance for GitOps: Preserve the accepted GitOps intent in implementation and deployment evidence.
deny[msg] {
  input.metadata.annotations["aiw.io/pattern"] != "PAT-GITOPS"
  msg := "Missing governed AIW pattern annotation"
}
