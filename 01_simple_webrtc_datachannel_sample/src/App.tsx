import React, { useState } from 'react'
import './App.css'

interface ConnectStateType {
  localConnection: null | RTCPeerConnection
  remoteConnection: null | RTCPeerConnection
}

function App(): JSX.Element {
  const [connectState, setConnectState] = useState<ConnectStateType>({
    localConnection: null,
    remoteConnection: null,
  })
  const [sendChannel, setSendChannel] = useState<RTCDataChannel>(null)
  const [receiveChannel, setReceiveChannel] = useState<RTCDataChannel>(null)

  const [formState, setFormState] = useState({
    inputDisabled: true,
    sendButtonDisabled: true,
    disconnectButtonDisabled: true,
    connectButtonDisabled: false,
  })
  const [receiveMessage, setReceiveMessage] = useState('')
  const [message, setMessage] = useState('')

  const connectPeers = async () => {
    const localConnection: RTCPeerConnection = new RTCPeerConnection()

    // Create the data channel and establish its event listeners
    const _sendChannel = localConnection.createDataChannel('sendChannel')
    _sendChannel.onopen = handleSendChannelStatusChange
    _sendChannel.onclose = handleSendChannelStatusChange
    setSendChannel(_sendChannel)

    // Create the remote connection and its event listeners
    const remoteConnection = new RTCPeerConnection()
    remoteConnection.ondatachannel = receiveChannelCallback

    // Set up the ICE candidates for the two peers
    localConnection.onicecandidate = (e) => {
      return (
        !e.candidate ||
        remoteConnection
          .addIceCandidate(e.candidate)
          .then(handleLocalAddCandidateSuccess)
          .catch(handleAddCandidateError)
      )
    }
    remoteConnection.onicecandidate = (e) => {
      return (
        !e.candidate ||
        localConnection
          .addIceCandidate(e.candidate)
          .then(handleRemoteAddCandidateSuccess)
          .catch(handleAddCandidateError)
      )
    }

    try {
      // Now create an offer to connect; this starts the process
      const offer = await localConnection.createOffer()
      await localConnection.setLocalDescription(offer)
      localConnection.localDescription &&
        (await remoteConnection.setRemoteDescription(
          localConnection.localDescription
        ))
      const answer = await remoteConnection.createAnswer()
      await remoteConnection.setLocalDescription(answer)
      remoteConnection.localDescription &&
        (await localConnection.setRemoteDescription(
          remoteConnection.localDescription
        ))
    } catch (e) {
      handleCreateDescriptionError(e)
    }

    setConnectState({
      localConnection,
      remoteConnection,
    })
  }

  const disconnectPeers = () => {
    // Close the RTCDataChannels if they're open.
    sendChannel?.close()
    receiveChannel?.close()

    // Close the RTCPeerConnections
    connectState.localConnection?.close()
    connectState.remoteConnection?.close()

    setConnectState({
      localConnection: null,
      remoteConnection: null,
    })
    setSendChannel(null)
    setReceiveChannel(null)

    setFormState({
      inputDisabled: true,
      sendButtonDisabled: true,
      disconnectButtonDisabled: true,
      connectButtonDisabled: false,
    })

    setMessage('')
  }

  const handleSendChannelStatusChange = (event: RTCDataChannelEvent) => {
    const _sendChanel: RTCDataChannel | null = event.target as RTCDataChannel
    if (_sendChanel) {
      const state = _sendChanel.readyState

      console.log('sendChannel state: ', state)

      if (state === 'open') {
        setFormState({
          inputDisabled: false,
          sendButtonDisabled: false,
          disconnectButtonDisabled: false,
          connectButtonDisabled: true,
        })
      } else {
        setFormState({
          inputDisabled: true,
          sendButtonDisabled: true,
          disconnectButtonDisabled: true,
          connectButtonDisabled: false,
        })
      }
    }
  }

  function handleCreateDescriptionError(error) {
    console.log('Unable to create an offer: ' + error.toString())
  }

  function handleLocalAddCandidateSuccess() {
    formState.connectButtonDisabled = true
  }

  function handleRemoteAddCandidateSuccess() {
    formState.disconnectButtonDisabled = false
  }

  function handleAddCandidateError() {
    console.log('Oh noes! addICECandidate failed!')
  }

  const receiveChannelCallback = (event: RTCDataChannelEvent) => {
    const _receiveChannel = event.channel
    _receiveChannel.onmessage = handleReceiveMessage
    _receiveChannel.onopen = handleReceiveChannelStateChange
    _receiveChannel.onclose = handleReceiveChannelStateChange
    setReceiveChannel(_receiveChannel)
    console.log('receiveChannelCallback: ', event.channel)
  }

  const handleReceiveMessage = (event: MessageEvent) => {
    console.log('handleReceiveMessage: ', event.data)
    setReceiveMessage(event.data)
  }
  const handleReceiveChannelStateChange = () => {
    if (receiveChannel) {
      console.log(
        `Receive channel's status has changed to ${receiveChannel.readyState}`
      )
    }
  }

  const sendMessage = () => {
    sendChannel?.send(message)
    setMessage('')
  }

  const handleInputMessage = (e: InputEvent) => {
    e.target && setMessage(e.target.value)
  }

  return (
    <div>
      <div className="control-box">
        <button
          id="connectButton"
          name="connectButton"
          className="connect-button"
          disabled={formState.connectButtonDisabled}
          onClick={connectPeers}>
          Connect
        </button>
        <button
          id="disconnectButton"
          name="disconnectButton"
          className="disconnect-button"
          disabled={formState.disconnectButtonDisabled}
          onClick={disconnectPeers}>
          Disconnect
        </button>
      </div>
      <div className="message-box">
        <label form="message">
          Enter a message:
          <input
            value={message}
            id="message"
            type="text"
            name="message"
            placeholder="Message text"
            inputMode="latin"
            size={60}
            maxLength={120}
            disabled={formState.inputDisabled}
            onChange={handleInputMessage}
          />
        </label>
        <button
          id="sendButton"
          name="sendButton"
          className="send-button"
          disabled={formState.sendButtonDisabled}
          onClick={sendMessage}>
          Send
        </button>
      </div>
      <div id="receive-box" className="message-box">
        <p>Message received:</p>
        {!!receiveMessage && <p key="receiveMessage">{receiveMessage}</p>}
      </div>
    </div>
  )
}

export default App
