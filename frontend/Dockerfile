FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create a simple startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'while true; do' >> /app/start.sh && \
    echo '  echo "Starting Next.js dev server..."' >> /app/start.sh && \
    echo '  ./node_modules/.bin/next dev -H 0.0.0.0 || true' >> /app/start.sh && \
    echo '  echo "Server crashed, restarting in 2 seconds..."' >> /app/start.sh && \
    echo '  sleep 2' >> /app/start.sh && \
    echo 'done' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Run the dev server with auto-restart
CMD ["/app/start.sh"]
