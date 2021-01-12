import * as vscode from 'vscode';

//This line needs to be improved
//Maybe fixing the topic names and creating a interface, but this would decrease the hackability
function getGlobalStateOrEmptyObject(context: vscode.ExtensionContext): any {
	let temp: object | undefined = context.globalState.get<object>('idiwbtwo-storage');
	let storage: object | any = {};

	if (temp !== undefined) {
		storage = temp;
	}

	return storage;
}

export function activate(context: vscode.ExtensionContext) {

	context.globalState.update('idiwbtwo-storage', {});

	let api = {

		//This clearly have race conditions, which I'm going to solve by
		//implementing a retry mechanism in the extension
		//maybe some day I'll put a lock here
		subscribe(extensionId: string, topic: string) {

			let storage: object | any = getGlobalStateOrEmptyObject(context);

			if (!(topic in storage)) {
				storage[topic] = [];
			}

			if (extensionId in storage[topic]) { return { code: 200, message: 'Extension was already subscribed' }; }

			storage[topic].push(extensionId);
			context.globalState.update('idiwbtwo-storage', storage);

			return { code: 201, message: 'Extension subscribed with success' };

		},
		unsubscribe(extensionId: string, topic: string) {

			let storage: object | any = getGlobalStateOrEmptyObject(context);

			if (!(topic in storage)) {
				return { code: 200, message: 'Extension was already not subscribed' };
			}

			if (!(extensionId in storage[topic])) { return { code: 200, message: 'Extension was already not subscribed' }; }

			storage[topic] = storage[topic].filter((item: string) => item !== extensionId);
			context.globalState.update('idiwbtwo-storage', storage);

			return { code: 201, message: 'Extension unsubscribed with success' };

		},
		sendToTopic(topic: string, thing: object) {

			let storage: object | any = getGlobalStateOrEmptyObject(context);

			if(!(topic in storage)) { return { code: 404, message: "Topic not found"};}

			for(let extensionId of storage[topic]) {
				let temp = vscode.extensions.getExtension(extensionId);
				let extension: {recieveMessage: Function};

				if(temp === undefined){
					this.unsubscribe(extensionId, topic);
					continue;
				} else {
					if(!('recieveMessage' in temp)){
						this.unsubscribe(extensionId, topic);
						continue;
					}
				}
				extension = <{recieveMessage: Function}>temp;
				extension.recieveMessage(topic, thing);
			}

		}
	};

	return api;

}

export function deactivate() { }
