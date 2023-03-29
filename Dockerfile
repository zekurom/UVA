FROM node:lts as runner
WORKDIR /node-express
ENV NODE_ENV production
ARG COMMIT_ID
ENV COMMIT_ID=${COMMIT_ID}
COPY . .
RUN npm ci --only=production
EXPOSE 3000
CMD ["node", "src/index.js"]
