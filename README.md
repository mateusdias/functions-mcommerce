# Projeto de Exemplo para invocar Firebase Functions (onCall)

Durante a nossa última aula, ensinei como invocar funções no Firebase   
"Firebase Functions" do tipo "Callable" e este é o projeto correto
e completo para que vocês estudem o código e entendam.

## Passo 1 - Criando o projeto firebase 

Crie um projeto no Firebase pelo firebase web console: http://console.firebase.google.com/. Coloque o funcionamento dele na modalidade Blaze. 
Em seguida, habilite o banco no firestore na região **southamerica-east1**. 

No banco Firestore crie uma collection chamada, por exemplo, **products** e adicione um documento de produto, apenas para inicializar a coleção corretamente. Inicializar o banco com uma coleção, e um documento de testes é um passo importante pois garante que o Firestore está ok, funcionando e já disponível para integração. 

## Passo 2 - Crie as functions via código e faça o deploy no seu projeto

Como demonstrado na aula, fizemos uma firebase function que insere um produto e uma outra que retorna todos os produtos inseridos (apenas para exemplo).

O código completo em TypeScript do arquivo **index.ts** que é (lembre-se que tal arquivo deve ficar dentro do diretório functions do seu projeto de functions): 

**Atenção: Exemplo puramente didático e com algumas falhas que necessitam de conserto no futuro, mas apenas para simplificar o entendimento das partes**

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const app = admin.initializeApp();
const db = app.firestore();
const collProducts = db.collection("products");

interface CallableResponse{
  status: string,
  message: string,
  payload: JSON
}

interface Product{
  name: string,
  price: number
}

/**
 * Função que analisa se um produto é válido para ser gravado no banco.
 * Exemplo de validação na entrada. Complemente com as regras que achar
 * importante.
 * @param {Product} p - Objeto produto a ser validado.
 * @return {number} - Retorna 0 se válido ou o código de erro.
 **/
function analyzeProduct(p: Product) : number {
  if (!p.name) {
    return 1;
  }
  if (p.price <= 0) {
    return 2;
  }
  return 0;
}

/**
 * Função que dado o código de erro obtido na analyzeProduct,
 * devolve uma mensagem
 * @param {number} code - Código do erro
 * @return {string} - String com a mensagem de erro.
 */
function getErrorMessage(code: number) : string {
  let message = "";
  switch (code) {
    case 1: {
      message = "Nome do produto não informado.";
      break;
    }
    case 2: {
      message = "Valor do produto deve ser superior a zero.";
      break;
    }
  }
  return message;
}

export const addNewProduct = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
      let result: CallableResponse;

      // com o uso do logger, podemos monitorar os erros e o que há.
      functions.logger.info("addNewProduct - Iniciada.");
      // criando o objeto que representa o produto (baseado nos parametros)
      const p = {
        name: data.name,
        price: data.price,
      };
      // inclua aqui a validacao.
      const errorCode = analyzeProduct(p);
      const errorMessage = getErrorMessage(errorCode);
      if (errorCode > 0) {
        // gravar o erro no log e preparar o retorno.
        functions.logger.error("addNewProduct " +
          "- Erro ao inserir novo produto:" +
          errorCode.toString()),

        result = {
          status: "ERROR",
          message: errorMessage,
          payload: JSON.parse(JSON.stringify({docId: null})),
        };
        console.log(result);
      } else {
        // cadastrar o produto pois está ok.
        const docRef = await collProducts.add(p);
        result = {
          status: "SUCCESS",
          message: "Produto inserido com sucesso.",
          payload: JSON.parse(JSON.stringify({docId: docRef.id.toString()})),
        };
        functions.logger.error("addNewProduct - Novo produto inserido");
      }

      // Retornando o objeto result.
      return result;
    });

export const getAllProducts = functions
    .region("southamerica-east1")
    .https.onCall(async () => {
      // retorna todos os produtos
      const products : Array<Product> = [];
      const snapshot = await collProducts.get();
      let tempProduct: Product;
      snapshot.forEach((doc) => {
        const d = doc.data();
        tempProduct = {
          name: d.name,
          price: d.price,
        };
        products.push(tempProduct);
      });
      return products;
    });

```
Garanta que você salvou o arquivo após editá-lo. Uma vez que seu projeto está pronto basta você acessar o diretório functions e fazer os comandos de lint, build e enviar as functions para a nuvem.

```
$> cd functions
functions$> npm run lint
functions$> npm run build
functions$> firebase deploy --only functions

```

## Passo 3 - Nas configurações do projeto no firebase, adicione seu aplicativo Android 

Para que qualquer aplicativo tenha autorização para acessar os recursos do firebase, é importante que ele seja autorizado. Isso significa **adicioná-lo como aplicativo**.

Nas configurações do seu projeto no firebase, adicione um aplicativo Android. Ou seja, o app que construímos em sala, para que acesse as functions é necessário que ele seja "configurado". 

Coloque o nome do pacote completo que você criou no seu aplicativo, algo semelhante a: **br.com.empresa.meuapp**

Em seguida, faça o download do arquivo google-services.json e adicione este arquivo no diretorio **app** do seu aplicativo android.

## Passo 4 - Configurando os arquivos gradle no seu projeto Android

No android studio, mudando a perspectiva de visualização de projetos para "Android" em Gradle Scripts será possível enxergar **dois arquivos** de script para geração do aplicativo que são os arquivos extensão gradle. Ambos com o nome **build.gradle** um do projeto como um todo e outro do módulo app.

Seu script de build.gradle do projeto faça as alterações para que fique similar a isto:

```gradle
plugins {
    id 'com.android.application' version '7.1.1' apply false
    id 'com.android.library' version '7.1.1' apply false
    id 'org.jetbrains.kotlin.android' version '1.6.10' apply false
    // acrescentar a linha abaixo:
    id 'com.google.gms.google-services' version '4.3.10' apply false
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
```

Já no arquivo **build.gradle** do Módulo app, devemos fazer os ajustes com mais atenção.
Na seção plugins deixe similar a isto: 

```gradle
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'

    // acrescentar o plugin do google-services:
    id 'com.google.gms.google-services'
}
```

Incluir mais algumas dependências importantes: 

``` gradle
dependencies {

    // Dependencias Firebase (coloque todas estas)
    implementation platform('com.google.firebase:firebase-bom:29.2.1')
    implementation 'com.google.firebase:firebase-analytics-ktx'
    implementation 'com.google.firebase:firebase-firestore-ktx:24.1.0'
    implementation 'com.google.firebase:firebase-functions-ktx:20.0.2'

    //Gson - Lib Google JSON que vamos utilizar.
    implementation 'com.google.code.gson:gson:2.8.9'

    // ... demais dependencias que já tem no seu projeto ...
}

```

## Passo 5 - No seu app Android

Agora, no seu aplicativo Android, lembre-se de ter incluido já o arquivo **google-services.json** dentro do diretorio app (módulo).

Acesse aqui o código completo do aplicativo para baixar e vamos analisar as partes importantes da **MainActivity.kt**

Na definição da classe temos alguns objetos/atributos importantes: As views, um objeto que acessa as firebase functions, uma string logEntry para "logar" os acontecimentos que você pode ver pela ferramenta Logcat do Android Studio (para saber o que está ocorrendo) e um objeto chamado gson. 
O gson é responsável por "traduzir" o JSON de resposta em objetos válidos no Kotlin. A ideia é que quando receber um JSON da resposta da function, ele possa ser convertido em um objeto válido em Kotlin, criado por você.

```kotlin
class MainActivity : AppCompatActivity() {

    private lateinit var etNomeProduto: TextInputEditText
    private lateinit var etValor: TextInputEditText
    private lateinit var btnCadastrarProduto: MaterialButton

    private lateinit var functions: FirebaseFunctions

    // usando o logcat (ferramenta do Android studio para verificar a saída)
    private val logEntry = "CADASTRO_PRODUTO";

    // instanciando um objeto gson
    private val gson = GsonBuilder().enableComplexMapKeySerialization().create()
    

```

No método **onCreate** instanciamos o objeto functions adequando a região. Por isso na aula deu o erro NOT_FOUND, pois não estava encontrando a função na região padrão us-central. Uma vez, que fizemos o deploy delas na região southamerica-east1.

Veja: 

```kotlin
 // inicializar o uso dos functions NA REGIAO DESEJADA
 functions = Firebase.functions("southamerica-east1")
```

Além disso na MainActivity.kt temos o método privado que faz a requisição da function **addNewProduct** retornando uma task que será continuada no próximo passo:

```kotlin

private fun cadastrarProduto(p: Product): Task<String> {
        val data = hashMapOf(
            "name" to p.name,
            "price" to p.price
        )
        return functions
            .getHttpsCallable("addNewProduct")
            .call(data)
            .continueWith { task ->
                // convertendo o resultado em string Json válida
                val res = gson.toJson(task.result?.data)
                res
            }
    }

```

E por fim, o método cadastrarProduto é invocado a partir do click no botão cadastrar e o tratamento é feitod e maneira correta: 

```kotlin

        // ajustando o listener do btnCadastrar
        btnCadastrarProduto.setOnClickListener {

            val p = Product(etNomeProduto.text.toString(), etValor.text.toString().toDouble())
            cadastrarProduto(p)
                .addOnCompleteListener(OnCompleteListener { task ->
                    if (!task.isSuccessful) {

                        val e = task.exception
                        if (e is FirebaseFunctionsException) {
                            val code = e.code
                            val details = e.details
                        }

                        // tratar a exceção...

                    }else{

                        /**
                         * Lembre-se que na Function criamos um padrão de retorno.
                         * Um JSON composto de status, message e payload.
                         * Podemos obter esse Json genérico e convertê-lo para um
                         * objeto da classe nossa FunctionsGenericResponse
                         * e a partir dali, tratar o não a conversão do payload. Veja:
                         */

                        // convertendo.
                        val genericResp = gson.fromJson(task.result, FunctionsGenericResponse::class.java)


                        // abra a aba Logcat e selecione "INFO" e filtre por
                        Log.i(logEntry, genericResp.status.toString())
                        Log.i(logEntry, genericResp.message.toString())

                        // claro, o payload deve ser convertido para outra coisa depois.
                        Log.i(logEntry, genericResp.payload.toString())

                        /*
                            Converter o "payload" para um objeto mais específico para
                            tratar o docId. Veja a classe "GenericInsertResponse" que eu criei...
                            Lembrando que para cada situação o payload é um campo "polimorfico"
                            por isso na classe de resposta genérica é um Any.
                        */
                        val insertInfo = gson.fromJson(genericResp.payload.toString(), GenericInsertResponse::class.java)

                        Snackbar.make(btnCadastrarProduto, "Produto cadastrado: " + insertInfo.docId,
                        Snackbar.LENGTH_LONG).show();
                    }
                })
        }
    }
```

## CONSIDERAÇÕES FINAIS E IMPORTANTES:

Para entender todo o código, consulte as demais classes criadas para você, que são: FunctionsGenericResponse.kt, Product.kt, GenericInsertResponse.kt

Entenda o que são as "annotations" utilizadas na classe FunctionsGenericResponse.


## Referências

Para a elaboração desse manual, foram utilizadas as seguintes referências:

* [Guias do Firebase](https://firebase.google.com/docs/guides)
* [Guia de estilo Markdown do Github](https://guides.github.com/features/mastering-markdown/)


### Sobre
Elaborado por: Mateus Dias - Versão: 1.0 de 23 de Março de 2022




