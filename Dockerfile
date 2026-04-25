FROM node:20-slim

# Install native tools (Required for PDF/Word extraction)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# SPEED FIX:
# --loglevel warn: Hides the text that makes it look "stuck"
# --no-audit: Skips the 5-minute security check
RUN npm install --legacy-peer-deps --loglevel warn --no-audit --no-fund

# Copy the rest of your code
COPY . .

EXPOSE 5000
EXPOSE 5173