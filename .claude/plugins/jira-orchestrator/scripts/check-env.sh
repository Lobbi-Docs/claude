#!/bin/bash
# Check if required environment variables are set

check_var() {
    local var_name=$1
    local var_value="${!var_name}"

    if [ -n "$var_value" ]; then
        echo "${var_name}=SET"
        return 0
    else
        echo "${var_name}=MISSING"
        return 1
    fi
}

# Check all required variables
all_present=true

check_var "JIRA_API_TOKEN" || all_present=false
check_var "JIRA_SITE_URL" || all_present=false
check_var "JIRA_USER_EMAIL" || all_present=false

# Export site URL value (hide token)
if [ -n "$JIRA_SITE_URL" ]; then
    echo "SITE_URL=$JIRA_SITE_URL"
fi

if [ -n "$JIRA_USER_EMAIL" ]; then
    echo "USER_EMAIL=$JIRA_USER_EMAIL"
fi

if [ "$all_present" = true ]; then
    echo "ENV_STATUS=COMPLETE"
    exit 0
else
    echo "ENV_STATUS=INCOMPLETE"
    exit 1
fi
