import mysql.connector
def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Nishi@2120",
        database="rescuemind"
    )

    return connection