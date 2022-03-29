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
