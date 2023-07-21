import {websocketServerInstance} from "./websocket-server";
import {app} from "./methods";


app.listen(process.env.APP_PORT, () => {
    console.log("Server listening at PORT:", process.env.APP_PORT);
    websocketServerInstance.start();
});