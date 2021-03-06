import { ethers } from 'ethers'
import fs from 'fs'
const prompts = require('prompts')

const privateKeyToWallet = (privKey: string) => {
  try {
    const wallet = new ethers.Wallet(privKey)
    return wallet
  } catch (err) {
    throw Error(err)
  }
}

const newPrivateKey = (extraEntropy: string) => {
  try {
    const wallet = ethers.Wallet.createRandom(extraEntropy)
    return wallet
  } catch (err) {
    throw Error(err)
  }
}

const mnemonicToWallet = (mnemonic: string) => {
  try {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic)
    console.log(wallet.path)
    return wallet
  } catch (err) {
    throw Error(err)
  }
}

const saveKeystore = async (wallet: any, src: string, pass: string) => {
  try {
    const encryptedKeystore = await wallet.encrypt(pass)
    writeFile(src, encryptedKeystore)
    console.log('[INFO] Saved keystore to ', src)
  } catch (err) {
    throw Error(err)
  }
}

const decryptKeystore = async (keystore_path: string, password: string) => {
  try {
    const file: Buffer = fs.readFileSync(keystore_path)
    const keystore = JSON.parse(file.toString())
    const wallet = await ethers.Wallet.fromEncryptedJson(
      JSON.stringify(keystore),
      password
    )
    return wallet
  } catch (err) {
    throw Error(err)
  }
}

const writeFile = (path: string, data: any) => {
  try {
    fs.writeFileSync(path, data)
    return path
  } catch (err) {
    throw Error(err)
  }
}

const textInput = async (message: string, type = 'text') => {
  try {
    const command = await prompts({
      type: type,
      name: 'value',
      message: message,
      validate: (value: string) => value.length > 0
    })
    return command
  } catch (err) {
    throw Error(err)
  }
}

const getWallet = async () => {
  try {
    let wallet
    const key_format = await prompts({
      type: 'select',
      name: 'value',
      message: 'What format is the private key in?\n',
      choices: [
        { title: 'keystore', value: 1 },
        { title: 'mnemonic', value: 2 },
        { title: 'private key', value: 3 },
        { title: 'new', value: 4 }
      ]
    })
    switch (key_format.value) {
      case 1: {
        let input_keystore = { value: '' }
        let errors = 0
        while (!fs.existsSync(input_keystore.value)) {
          if (errors > 3) throw Error('Failed to find keystore file')
          input_keystore = await textInput(
            `Keystore file: \n ${process.env.PWD}/<keystore_file>`
          )
          // TODO: check for absolute paths
          input_keystore.value = process.env.PWD + '/' + input_keystore.value
          if (!fs.existsSync(input_keystore.value)) {
            console.log(`File doesn't exist ${input_keystore.value}`)
            errors++
          }
        }
        const old_keystore_pass = await textInput(
          'Password to decrypt keystore: ',
          'password'
        )
        wallet = await decryptKeystore(
          input_keystore.value,
          old_keystore_pass.value
        )
        console.log('[INFO] Decrypted wallet: ', wallet.address)
        return wallet
      }
      case 2: {
        const mnemonic = await textInput('Paste the mnemonic: ', 'password')
        wallet = await mnemonicToWallet(mnemonic.value)
        console.log('[INFO] Opened wallet: ', wallet.address)
        return wallet
      }
      case 3: {
        const private_key = await textInput(
          'Paste the private key: ',
          'password'
        )
        wallet = await privateKeyToWallet(private_key.value)
        console.log('[INFO] Opened wallet: ', wallet.address)
        return wallet
      }
      case 4: {
        wallet = newPrivateKey('')
        console.log('[INFO] Opened wallet: ', wallet.address)
        return wallet
      }
      default: {
        throw Error('Couldnt read input')
      }
    }
  } catch (err) {
    throw Error(err)
  }
}

const output = async (wallet: any) => {
  try {
    const current_dir = process.env.PWD
    const output_format = await prompts({
      type: 'select',
      name: 'value',
      message: 'What format to output?\n',
      choices: [
        { title: 'keystore', value: 1 },
        { title: 'private key', value: 2 }
      ]
    })
    switch (output_format.value) {
      case 1: {
        const keystore_name = await textInput('New keystore name: ')
        let keystore_pass = { value: '' }
        let check = { value: '' }
        while (check.value !== keystore_pass.value || check.value === '') {
          keystore_pass = await textInput(
            'New password for keystore: ',
            'password'
          )
          check = await textInput('Repeat password for keystore: ', 'password')
          if (keystore_pass.value !== check.value) {
            console.log('Passwords dont match!')
          }
        }
        const output = `${current_dir}/${keystore_name.value}`
        await saveKeystore(wallet, output, keystore_pass.value)
        return
      }
      case 2: {
        console.log(wallet.privateKey)
        return
      }
    }
  } catch (err) {
    throw Error(err)
  }
}

const main = async () => {
  try {
    const wallet = await getWallet()
    if (!wallet) throw Error('Failed to parse wallet')
    output(wallet)
  } catch (err) {
    console.log(err)
  }
}

main()
