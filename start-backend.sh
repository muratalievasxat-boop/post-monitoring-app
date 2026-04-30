#!/bin/bash
cd /Users/askhat/projects/post-monitoring-app/backend
DATABASE_URL="postgresql://neondb_owner:npg_cwGUTQv53jIB@ep-young-thunder-alshcvp2-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" node src/main.js
