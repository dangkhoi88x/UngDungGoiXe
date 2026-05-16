FROM maven:3.9.9-amazoncorretto-21 AS build
WORKDIR /app

COPY pom.xml .
COPY src ./src
COPY .mvn ./.mvn
COPY mvnw .

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

FROM amazoncorretto:21
WORKDIR /app

COPY --from=build /app/target/UngDungGoiXe-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]