FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Generate dataset if not already present
RUN node src/data/generate_dataset.js

EXPOSE 5001

CMD ["npm", "start"]
