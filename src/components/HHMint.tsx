import React, { useState, useEffect } from 'react';
import { VStack, Stack, Button, Text, Grid, GridItem, Image,
  Accordion, AccordionItem, AccordionButton,AccordionPanel,
  AccordionIcon, useMediaQuery, Container, Box, Alert,
  AlertIcon, AlertTitle, AlertDescription, Toast, useToast } from "@chakra-ui/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { GenericFile, TransactionBuilderItemsInput, Umi, 
  generateSigner, percentAmount, signerIdentity, sol, transactionBuilder, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { createNft, fetchAllDigitalAssetByUpdateAuthority, fetchAllDigitalAssetByVerifiedCollection, fetchDigitalAsset, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { bundlrUploader } from "@metaplex-foundation/umi-uploader-bundlr";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import { gridButtonsData } from './buttonData';
import axios from 'axios';
import parseString from 'xml2js';
import 'text-encoding';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faTikTok, faInstagram } from '@fortawesome/free-brands-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';

//TODO: configure environment variables

//TODO: move front end logic to generate image to serveless function

//TODO: use openai api to score headline for pricing during image generation function on vercel and create jwt token

//TODO: check scoring token against passed in score during mint process

//TODO: create jwt token for headlines array returned rss feed within getNews serverless function 
//to cross check that the user chosen headline passed into generateImage serverless function
//is part of the array of headlines from rss feed

//TODO: cross check jwt token again to be sure that no false data can be passed to mintHH function

const rpcNode = process.env.rpcNode;
let currentPromptIndex = 0;
let umi: Umi;

library.add(faTwitter, faTelegram, faLinkedin, faGithub);

if (rpcNode) {
  umi = createUmi(rpcNode)
  .use(mplTokenMetadata())
  .use(bundlrUploader());
} else {
  console.error('RPC node environment variable is not defined.');
}

interface HHMintProps {
  userPublicKey?: string;
}

const HHMint: React.FC<HHMintProps> = ({ userPublicKey }) => {
  const { select, wallets, publicKey, disconnect } = useWallet();

  const [news, setNews] = useState<string[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedHeadline, setSelectedHeadline] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [realData1, setRealData] = useState<ArrayBuffer | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isTooltipVisible, setTooltipVisible] = useState(false);

  const showTooltip = () => setTooltipVisible(true);
  const hideTooltip = () => setTooltipVisible(false);

  const tooltipStyles: React.CSSProperties = {
    visibility: isTooltipVisible ? 'visible' : 'hidden',
    width: '300px',
    backgroundColor: '#f9f9f9',
    color: '#333',
    textAlign: 'left',
    borderRadius: '5px',
    padding: '10px',
    position: 'absolute',
    zIndex: 1,
    bottom: '125%',
    left: '50%',
    marginLeft: '-150px',
    opacity: isTooltipVisible ? 1 : 0,
    transition: 'opacity 0.3s',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    maxHeight: '200px', // Limit the height of the tooltip
    overflowY: 'auto' // Add scroll for overflow
  };

  const arrowStyles: React.CSSProperties = {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: '50%',
    marginLeft: '-5px',
    borderWidth: '5px',
    borderStyle: 'solid',
    borderColor: '#f9f9f9 transparent transparent transparent'
  };

  const infoIconStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    cursor: 'pointer',
    color: '#007bff',
    fontSize: '16px', // Smaller font size for the icon
    width: '24px',
    height: '24px',
    borderRadius: '50%', // Make the icon circular
    backgroundColor: '#e0e0e0', // Background color for the circle
    
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: '24px'
  };

  const textStyles: React.CSSProperties = {
    fontSize: '14px' // Adjust font size for the tooltip content
  };


  const wallet = useWallet();
  umi.use(walletAdapterIdentity(wallet));

  const toast = useToast();

  async function fetchAssets() {
    try {
      const owner = new PublicKey("DMteCYezdd8Pzhk7LpMF9fGcKBfiqA5kzmPguiZhENDe");
      let newKey = fromWeb3JsPublicKey(owner);
      const assets = await fetchAllDigitalAssetByUpdateAuthority(umi, newKey);
      console.log("Collection: " + assets);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  }

  useEffect(() => {
    if (userPublicKey) {
      console.log('Referral Key: ', userPublicKey);
    }
    fetchAssets();
    fetchHeadline();
  }, [userPublicKey]);

  async function fetchHeadline() {
    try {
      const response = await axios.get('/api/getNews');
      
      setNews(response.data.headlines);
    } catch (error) {
        console.error('Error fetching news:', error);
    }
}


  function handleStyleClick(style: string, id: string) {
    setSelectedStyle(style);
    gridButtonsData.forEach(button => {
      if (button.id !== id) {
        document.getElementById(button.id)?.classList.remove('selected');
      }
    });
    document.getElementById(id)?.classList.add('selected');
  }

  async function handleHeadlineClick(headline: string, index: number) {
    setSelectedHeadline(headline); // Assuming setSelectedHeadline sets the selected headline state
    document.querySelectorAll('.headline-button').forEach((button) => {
        button.classList.remove('selected');
    });
    document.getElementById(`headline-button-${index}`)?.classList.add('selected');

    // Call queryHeadlines for the selected headline
  //   const scores = await queryHeadlines([headline]).then((response) => {
  //     // Extracting the score using regular expression
  //     const regex = /(\d+\.\d+)/; // Match any number with decimal
  //     const match = response[0][0].generated_text.match(regex); // Assuming the response structure is consistent
  
  //     if (match) {
  //         const score = parseFloat(match[0]);
  //         console.log(score);
  //     } else {
  //         console.error('Score not found in the response');
  //     }
  // });
  //   console.log('Scores for the selected headline:', scores);
}


//   async function queryHeadlines(news: string[]) {
//   const hfApi = process.env.hfApi;
//   const scores = [];

//   if (hfApi) {
//       for (const headline of news) {
//         const data = {
//           "inputs": "Score the historical significance of the following news headline from 0.01 to 0.99: " + headline + ". Return just the number, absolutely no text",
//       };
//         console.log(data)
//           const response = await fetch(
//               "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
//               {
//                   headers: { 
//                   "Content-Type": "application/json",
//                   Authorization: hfApi },
//                   method: "POST",
//                   body: JSON.stringify(data),
//               }
//           );
//           const result = await response.json();
//           scores.push(result);
//       }
//   }

//   return scores;
// }

  useEffect(() => {
    console.log(selectedStyle);
  }, [selectedStyle]);

  const prompts = [
    "Craft a masterpiece, channeling the aesthetic essence of " + selectedStyle + ", to convey the message behind the headline: " + '"' + selectedHeadline + '"',
    "Design an exquisite piece, drawing inspiration from the visual language of " + selectedStyle + ", to interpret the narrative within the headline: " + '"' + selectedHeadline + '"',
    "Produce an artistic marvel, embracing the stylistic elements of " + selectedStyle + ", to articulate the story encapsulated in the headline: " + '"' + selectedHeadline + '"',
    "Create a visual symphony, echoing the design ethos of " + selectedStyle + ", to mirror the essence of the headline: " + '"' + selectedHeadline + '"',
    "Fashion a captivating artwork, embodying the visual characteristics of " + selectedStyle + ", to depict the essence of the headline: " + '"' + selectedHeadline + '"',
    "Construct a striking composition, influenced by the aesthetic principles of " + selectedStyle + ", to illuminate the essence of the headline: " + '"' + selectedHeadline + '"',
    "Shape an evocative piece, drawing from the visual motifs of " + selectedStyle + ", to encapsulate the essence of the headline: " + '"' + selectedHeadline + '"',
    "Devise a stunning creation, inspired by the visual aesthetics of " + selectedStyle + ", to reflect the narrative conveyed in the headline: " + '"' + selectedHeadline + '"',
    "Forge an artistic interpretation, mirroring the visual cues of " + selectedStyle + ", to convey the underlying message of the headline: " + '"' + selectedHeadline + '"',
    "Sculpt an expressive artwork, embodying the stylistic nuances of " + selectedStyle + ", to capture the essence of the headline: " + '"' + selectedHeadline + '"'
  ];

  async function generateImage(selectedStyle: string | null) {
    try {
      setImageSrc(null);
      setLoading(true);
  
      const currentPrompt = prompts[currentPromptIndex];
      console.log(currentPrompt);
      
      const hfApi = "Bearer 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";
      const hfApiEndpoint = "https://api-inference.huggingface.co/models/prompthero/openjourney";
  
      if (hfApi && hfApiEndpoint) {
        const response = await fetch(
          hfApiEndpoint,
          {
            headers: { Authorization: hfApi },
            method: "POST",
            body: JSON.stringify({ inputs: currentPrompt }),
          }
        );
  
        currentPromptIndex++;
        console.log(currentPromptIndex);
        
        if (currentPromptIndex === prompts.length) {
          currentPromptIndex = 0;
        }
        
        if (!response.ok) {
          setLoading(false);
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      
        const blob = await response.blob();
        const realData = await blob.arrayBuffer();
        setRealData(realData);
  
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(realData)));
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;
        setLoading(false);
        setImageSrc(dataUrl);
  
        // Create a File object from the generated image data
        const file = new File([realData], 'generated_image.jpg', { type: 'image/jpeg' });
        setImageFile(file);
      } else {
        console.error('Hugging Face API environment variable is not defined.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  

  function generateSpecialLink() {
    if (publicKey) {
      const specialLink = `http://localhost:3000/${publicKey.toBase58()}`;
      navigator.clipboard.writeText(specialLink)
        .then(() => {
          console.log('Special link copied to clipboard: ', specialLink);
        })
        .catch((error) => {
          console.error('Error copying to clipboard: ', error);
        });
    }
  }

  const handleMint = async (imageFile: File, selectedHeadline: string, selectedStyle: string) => {
    console.log('Start mint process...');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        if (result) {
          const base64Image = result.split(',')[1]; // Get Base64 part
          const response = await axios.post('/api/mintHH', {
            image: base64Image,
            selectedHeadline: selectedHeadline,
            selectedStyle: selectedStyle
          });
          

          if (response.status === 200) {
            console.log('Minting successful: ', response.data.serialized);
            const arr = Object.values(response.data.serialized) as unknown[]; // Example array of numbers
            const uint8Array = new Uint8Array(arr.map(num => Number(num)));
            const deserialized = umi.transactions.deserialize(uint8Array);
            await umi.identity.signTransaction(deserialized);
            await umi.rpc.sendTransaction(deserialized);
          } else {
            console.error('Unexpected response status: ', response.status);
            return null;
          }
        } else {
          console.error('Error reading image file.');
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file: ', error);
      };

      reader.readAsDataURL(imageFile); // Ensure imageFile is of type File or Blob
    } catch (error) {
      console.error('Error calling mint function: ', error);
      return null;
    }
    toast({
      title: 'Your Paper is being minted!',
      description: 'As an owner of the collection you are now entitled to earn a 20% commission on all NFTs minted using your referral link.',
      status: 'success',
      duration: 15000,
      isClosable: true,
      position: 'top', });
  };

  return !publicKey ? (
    
    <Stack gap={4} align="center">
 
      <Text style={{
          maxWidth: '80%',
          wordWrap: 'break-word',
          textAlign: 'center',
        }}>
      Paperboy converts 
      PaperBoy is a unique NFT collection that enables users to create and mint AI-generated artworks
      based on headlines pulled from the Google News RSS Feed. Each artwork is a one-of-a-kind piece
      generated using advanced AI algorithms, resulting in a diverse and dynamic collection of digital art.
      Earn a 20% commission on any piece minted with your referral code(Once you mint a paper).
      </Text>
      
      {wallets.filter((wallet) => wallet.readyState === "Installed").length >
      0 ? (
        
        wallets
        
          .filter((wallet) => wallet.readyState === "Installed")
          .map((wallet) => (
            
            <Button
              key={wallet.adapter.name}
              onClick={() => select(wallet.adapter.name)}
              bgGradient="linear(to-r, #9945FF, #14F195)"
              w="64"
              size="lg"
              fontSize="md"
              leftIcon={
                <Image
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  h={6}
                  w={6}
                />
              }
            >
              {wallet.adapter.name}
            </Button>
          
          ))
          
      ) : (
        <Text>No wallet found. Please download a supported Solana wallet</Text>
      )}
      
      <footer style={{ textAlign: 'center', paddingTop: '20px' }}>
  <p style={{ marginBottom: '2px', fontWeight: 'bold', fontSize: '1rem', background: 'linear-gradient(to right, #9945FF, #14F195)', WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent' }}>PaperBoy</p>
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
    <a href="https://x.com/atl5d" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTwitter} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
  </div>
  <p style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '1rem', background: 'linear-gradient(to right, #9945FF, #14F195)', WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent' }}>Made by TheWizardofHahz</p>
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
    <a href="https://x.com/thewizardofhahz" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTwitter} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
    <a href="https://t.me/hahznft" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTelegram} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
    <a href="https://tiktok.com/@hahzcandy" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTikTok} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
    <a href="https://github.com/hahzcandy" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faInstagram} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
  </div>
</footer>

    
    </Stack>
  ) : (
    
    <Stack gap={4} align="center">
 
      <Text
        style={{
          maxWidth: '80%',
          wordWrap: 'break-word',
          textAlign: 'center',
        }}
      >
        {publicKey.toBase58()}
      </Text>

      <Button onClick={disconnect} bgGradient="linear(to-r, #9945FF, #14F195)">Disconnect Wallet</Button>

      <Text style={{
          maxWidth: '80%',
          wordWrap: 'break-word',
          textAlign: 'center',
        }}>
      Using your chosen headline and visual style, any current event can be transformed into an 
      artistic masterpiece that echoes the pulse of contemporary life.
      </Text>

      <Accordion allowToggle
       style={{
          width: "80%",
          display: "flex",
          flexDirection: "column",
          alignContent: "center",
          justifyContent: "center",
          textAlign: "center"
        }}>
        <AccordionItem>
          <h2>
            <AccordionButton _expanded={{ bgGradient: "linear(to-r, #9945FF, #14F195)", color: 'white' }}>
              <Box>
                Headline
              </Box>
            </AccordionButton>
          </h2>

          <AccordionPanel pb={4}>
          {selectedHeadline && <Text>{selectedHeadline}</Text>}  
              <Grid
                templateColumns={{ base: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
                gap={4}
              >
                {news.map((headline, index) => (
                  <GridItem key={index}>
                    <Button
                      size="md"
                      width="100%"
                      maxWidth="300px"
                      height="auto"
                      borderRadius="md"
                      onClick={() => handleHeadlineClick(headline, index)}
                      style={
                        selectedHeadline === headline
                          ? {
                              backgroundImage: 'linear-gradient(to right, #9945FF, #14F195)',
                              color: 'white',
                              flexDirection: 'column',
                              alignItems: 'center',
                              display: 'flex',
                            }
                          : {
                              flexDirection: 'column',
                              alignItems: 'center',
                              display: 'flex',
                            }
                      }
                      className="headline-button"
                      id={`headline-button-${index}`}
                      px={4}
                      py={2}
                    >
                      <Text
                        // Allow text to wrap to multiple lines
            style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
            textAlign="center"
                      >{headline}</Text>
                    </Button>
                  </GridItem>
                ))}
              </Grid>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton _expanded={{ bgGradient: "linear(to-r, #9945FF, #14F195)", color: 'white' }}>
              <Box>
                Style
              </Box>
              {/* <AccordionIcon /> */}
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
          {selectedHeadline && <Text>{selectedHeadline}</Text>}
          <Box padding="20px">
      <Grid 
         templateColumns={{ base: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)"}} 
            gap={4}>
        {gridButtonsData.map((button, index) => (
          <GridItem key={index}>
              <Button
                size="md"
                width="100%"
                height="auto"
                borderRadius="md"
                onClick={() => handleStyleClick(button.label, button.id)}
                style={
                  selectedStyle === button.label
                    ? {
                        backgroundImage: "linear-gradient(to right, #9945FF, #14F195)",
                        color: "white",
                        flexDirection: "column",
                        alignItems: "center",
                        display: "flex",
                      }
                    : {
                        flexDirection: "column",
                        alignItems: "center",
                        display: "flex",
                      }
                }
              >
              <Image paddingTop="5px" src={button.imageUrl} alt={`Image ${index}`} boxSize="100px" />
              <Text>{button.label}</Text>
            </Button>

          </GridItem>
        ))}
      </Grid>
      </Box>
          </AccordionPanel>
        </AccordionItem>
      
    <AccordionItem>
    <h2>
      <AccordionButton _expanded={{ bgGradient: "linear(to-r, #9945FF, #14F195)", color: 'white' }}>
        <Box>
          Generate
        </Box>
        {/* <AccordionIcon /> */}
      </AccordionButton>
    </h2>
    <AccordionPanel pb={4}>
    <div>
    {[selectedHeadline, selectedStyle] && <Text>An interpretation of &quot;{selectedHeadline}&quot; inspired by the {selectedStyle} style.</Text>}
    <Button onClick={() => generateImage(selectedStyle)} bgGradient="linear(to-r, #9945FF, #14F195)">Generate Image</Button>
    <Box>
    {loading && <p>Creating image, this will take a second...</p>}
    </Box>
    <br />
    <Box style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center"
        }}>
    {imageSrc && <Image src={imageSrc} alt="Generated Image" />}
    </Box>
    </div>
    </AccordionPanel>
  </AccordionItem>

  <AccordionItem>
    <h2>
      <AccordionButton _expanded={{ bgGradient: "linear(to-r, #9945FF, #14F195)", color: 'white' }}>
        <Box>
          Mint
        </Box>
        {/* <AccordionIcon /> */}
      </AccordionButton>
    </h2>
    <AccordionPanel pb={4}>
    {[selectedHeadline, selectedStyle] && <Text>An interpretation of &quot;{selectedHeadline}&quot; inspired by the {selectedStyle} style.</Text>}
    <Box style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center"
        }}>
    {imageSrc && <Image src={imageSrc} alt="Generated Image" />}
    </Box>
    <div>
    <Text>{price !== null ? `${price} SOL` : 'Loading...'}</Text>
    <div style={infoIconStyles} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      ℹ
      <div style={tooltipStyles}>
        <div style={arrowStyles}></div>
        <strong>Price is based on the average of following scoring criteria:</strong><br /><br />
        <strong>Global Impact:</strong><br />
        0.01 to 0.2: Minor local interest (e.g., local events, minor news).<br />
        0.21 to 0.5: Significant national interest (e.g., national sports events, national political news).<br />
        0.51 to 0.8: Major international interest (e.g., international sporting events, significant political events in large countries).<br />
        0.81 to 1: Worldwide impact (e.g., global pandemics, world wars, major scientific breakthroughs).<br /><br />
        <strong>Longevity:</strong><br />
        0.01 to 0.2: Short-term interest (days to weeks).<br />
        0.21 to 0.5: Medium-term interest (months to a few years).<br />
        0.51 to 0.8: Long-term interest (decades).<br />
        0.81 to 1: Permanent impact (centuries or more).<br /><br />
        <strong>Cultural Significance:</strong><br />
        0.01 to 0.2: Minor or niche cultural impact.<br />
        0.21 to 0.5: Significant cultural impact within a country or region.<br />
        0.51 to 0.8: Major cultural impact affecting multiple countries or regions.<br />
        0.81 to 1: Profound cultural impact, leading to major changes in global culture or history.<br /><br />
        <strong>Media Coverage:</strong><br />
        0.01 to 0.2: Limited media coverage.<br />
        0.21 to 0.5: Moderate media coverage in a few countries.<br />
        0.51 to 0.8: Extensive media coverage in many countries.<br />
        0.81 to 1: Intense media coverage globally.
      </div>
    </div>
    </div>
    <Button onClick={() => {
  if (imageFile && selectedHeadline && selectedStyle) {
    handleMint(imageFile, selectedHeadline, selectedStyle);
  } else {
    console.error("ImageSrc is null");
  }
}} bgGradient="linear(to-r, #9945FF, #14F195)">Mint your Paper</Button>
      
    </AccordionPanel>
  </AccordionItem>
  </Accordion>
  
    {isOwner && (   
      <Button onClick={generateSpecialLink} bgGradient="linear(to-r, #9945FF, #14F195)">Generate Referral Link</Button>
    )}

<footer style={{ textAlign: 'center', paddingTop: '20px' }}>
  <p style={{ marginBottom: '2px', fontWeight: 'bold', fontSize: '1rem', background: 'linear-gradient(to right, #9945FF, #14F195)', WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent' }}>PaperBoy</p>
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
    <a href="https://x.com/atl5d" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTwitter} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
  </div>
  <p style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '1rem', background: 'linear-gradient(to right, #9945FF, #14F195)', WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent' }}>Made by The Wizard of Hahz</p>
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
    <a href="https://x.com/thewizardofhahz" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTwitter} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
    <a href="https://t.me/hahznft" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTikTok} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
    <a href="https://tiktok.com/@hahzcandy" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faTikTok} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
    <a href="https://instagram.com/hahzcandy" target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon icon={faInstagram} style={{ margin: '0 10px', fontSize: '24px', color: 'white' }} />
    </a>
  </div>
</footer>
<br />
    </Stack>
  );
};

export default HHMint;