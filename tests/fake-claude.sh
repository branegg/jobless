#!/bin/bash
if [[ "$*" == *"--json-schema"* ]]; then
  printf '%s\n' '{"type":"system","subtype":"init","tools":["StructuredOutput"]}'
  printf '%s\n' '{"type":"result","is_error":false,"result":"","total_cost_usd":0,"structured_output":{"headline":"Engineering leader","summary":{"text":"Shipped billing in Lodz.","sources":["facts/shipped-billing"]},"experience":[{"role":"Billing Lead","company":"Acme","period":"2024","sources":["facts/shipped-billing"],"bullets":[{"text":"Moved 40 customers to new billing.","sources":["facts/shipped-billing"]},{"text":"Grew revenue by 300%.","sources":["facts/shipped-billing"]}]}],"projects":[],"skills":[{"text":"Kubernetes expert","sources":[]}],"coverNote":[{"text":"I moved customers to new billing.","sources":["facts/shipped-billing"]}],"answers":[{"question":"Why do you want to work here?","answer":{"text":"Billing is what I know.","sources":["facts/shipped-billing"]}}],"gaps":["Asks for Go, which the record does not show."]}}'
  exit 0
fi
printf '%s\n' '{"type":"system","subtype":"init","tools":["Read","Glob","Grep"]}'
printf '%s\n' '{"type":"result","is_error":false,"result":"You shipped it. See `facts/shipped-billing`.","total_cost_usd":0}'
