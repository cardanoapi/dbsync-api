sudo docker stop dbsync-api-container         # Stop the existing container
sudo docker rm dbsync-api-container           # Remove the stopped container
sudo docker build -t dbsync-api .             # Build the latest image
sudo docker run -p 8081:8081 -d --name dbsync-api-container --env-file .env dbsync-api  # Start a new container
sudo docker logs dbsync-api-container